const User = require("../models/user.model");
const RbacRole = require("../models/rbacRole.model");
const UserRole = require("../models/userRole.model");
const { LEGACY_ROLE_PERMISSIONS } = require("../config/permissions");

const LEGACY_COLLECTIONS = {
  roles: "experimental_roles",
  userRoles: "experimental_user_roles",
};

async function collectionExists(name) {
  const collections = await RbacRole.db.db.listCollections({ name }, { nameOnly: true }).toArray();
  return collections.length > 0;
}

/**
 * Copia una sola vez los datos de las colecciones anteriores a las definitivas.
 * Es idempotente y conserva las colecciones de origen como respaldo.
 */
exports.migrateLegacyCollections = async function () {
  if (await collectionExists(LEGACY_COLLECTIONS.roles)) {
    const roles = await RbacRole.db.db.collection(LEGACY_COLLECTIONS.roles).find({}).toArray();
    if (roles.length) {
      await RbacRole.bulkWrite(roles.map(({ _id, updatedAt, ...role }) => ({
        updateOne: {
          filter: { key: role.key },
          update: { $setOnInsert: role },
          upsert: true,
        },
      })));
    }
  }

  if (await collectionExists(LEGACY_COLLECTIONS.userRoles)) {
    const assignments = await UserRole.db.db.collection(LEGACY_COLLECTIONS.userRoles).find({}).toArray();
    if (assignments.length) {
      await UserRole.bulkWrite(assignments.map(({ _id, updatedAt, ...assignment }) => ({
        updateOne: {
          filter: { userId: assignment.userId, roleKey: assignment.roleKey },
          update: { $setOnInsert: assignment },
          upsert: true,
        },
      })));
    }
  }
};

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function legacyPermissionsFor(admin) {
  return LEGACY_ROLE_PERMISSIONS[admin] || [];
}

function can(permissions, permission) {
  return permissions.includes("*") || permissions.includes(permission);
}

exports.resolveForUser = async function (user) {
  if (!user) {
    return {
      roles: [],
      permissions: [],
      source: "none",
    };
  }

  const assignments = await UserRole
    .find({ userId: user._id, active: true })
    .lean();
  const roleKeys = assignments.map((assignment) => assignment.roleKey);
  const assignedRoles = roleKeys.length
    ? await RbacRole.find({ key: { $in: roleKeys }, active: true }).lean()
    : [];

  const permissions = assignedRoles.flatMap((role) => role.permissions || []);
  const legacyPermissions = legacyPermissionsFor(user.admin);

  return {
    roles: assignedRoles.map((role) => ({
      key: role.key,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    })),
    roleKeys: assignedRoles.map((role) => role.key),
    permissions: unique([...legacyPermissions, ...permissions]),
    legacyAdmin: user.admin,
    source: assignedRoles.length ? "rbac+legacy" : "legacy",
  };
};

exports.getCurrentUserContext = async function (req) {
  const userId = req.user && req.user.sub;
  if (!userId) {
    const error = new Error("Autenticacion requerida.");
    error.status = 401;
    throw error;
  }

  const user = await User.findById(userId).select("-password");
  if (!user) {
    const error = new Error("Usuario no encontrado.");
    error.status = 401;
    throw error;
  }

  const access = await exports.resolveForUser(user);
  return { user, access };
};

exports.requirePermission = function (permission) {
  return async function (req, res, next) {
    try {
      const context = await exports.getCurrentUserContext(req);
      req.currentUser = context.user;
      req.access = context.access;

      if (!can(context.access.permissions, permission)) {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta accion.",
          permission,
        });
      }

      return next();
    } catch (error) {
      return res.status(error.status || 500).json({ message: error.message });
    }
  };
};

exports.requireAnyPermission = function (permissions) {
  return async function (req, res, next) {
    try {
      const context = await exports.getCurrentUserContext(req);
      req.currentUser = context.user;
      req.access = context.access;

      if (!permissions.some((permission) => can(context.access.permissions, permission))) {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta accion.",
          permissions,
        });
      }

      return next();
    } catch (error) {
      return res.status(error.status || 500).json({ message: error.message });
    }
  };
};

exports.can = can;

exports.listRoles = async function () {
  return RbacRole.find().sort({ key: 1 }).lean();
};

exports.listUsersWithAccess = async function () {
  const users = await User.find().select("-password").sort({ username: 1 }).lean();
  return Promise.all(users.map(async (user) => {
    const access = await exports.resolveForUser(user);
    return {
      id: user._id,
      username: user.username,
      admin: user.admin,
      roles: access.roles,
      permissions: access.permissions,
      accessSource: access.source,
      funerariaId: user.funerariaId,
    };
  }));
};

exports.upsertRole = async function ({ key, name, description = "", permissions = [], active = true }) {
  return RbacRole.findOneAndUpdate(
    { key: String(key).trim().toLowerCase() },
    {
      key: String(key).trim().toLowerCase(),
      name,
      description,
      permissions: unique(permissions),
      active,
    },
    { new: true, upsert: true, runValidators: true }
  ).lean();
};

exports.assignRole = async function ({ userId, roleKey, assignedBy }) {
  const key = String(roleKey).trim().toLowerCase();
  const role = await RbacRole.findOne({ key, active: true });
  if (!role) {
    const error = new Error("El rol no existe o no esta activo.");
    error.status = 404;
    throw error;
  }

  return UserRole.findOneAndUpdate(
    { userId, roleKey: key },
    {
      userId,
      roleKey: key,
      active: true,
      assignedBy,
    },
    { new: true, upsert: true, runValidators: true }
  ).lean();
};

exports.removeRole = async function ({ userId, roleKey }) {
  return UserRole.findOneAndUpdate(
    { userId, roleKey: String(roleKey).trim().toLowerCase() },
    { active: false },
    { new: true }
  ).lean();
};
