const User = require("../models/user.model");
const ExperimentalRole = require("../models/experimentalRole.model");
const ExperimentalUserRole = require("../models/experimentalUserRole.model");
const { LEGACY_ROLE_PERMISSIONS } = require("../config/experimentalPermissions");

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

  const assignments = await ExperimentalUserRole
    .find({ userId: user._id, active: true })
    .lean();
  const roleKeys = assignments.map((assignment) => assignment.roleKey);
  const experimentalRoles = roleKeys.length
    ? await ExperimentalRole.find({ key: { $in: roleKeys }, active: true }).lean()
    : [];

  const experimentalPermissions = experimentalRoles.flatMap((role) => role.permissions || []);
  const legacyPermissions = legacyPermissionsFor(user.admin);

  return {
    roles: experimentalRoles.map((role) => ({
      key: role.key,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    })),
    roleKeys: experimentalRoles.map((role) => role.key),
    permissions: unique([...legacyPermissions, ...experimentalPermissions]),
    legacyAdmin: user.admin,
    source: experimentalRoles.length ? "experimental+legacy" : "legacy",
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
  return ExperimentalRole.find().sort({ key: 1 }).lean();
};

exports.listUsersWithAccess = async function () {
  const users = await User.find().select("-password").sort({ username: 1 }).lean();
  return Promise.all(users.map(async (user) => {
    const access = await exports.resolveForUser(user);
    return {
      id: user._id,
      username: user.username,
      admin: user.admin,
      rolesExp: access.roles,
      permissions: access.permissions,
      accessSource: access.source,
      funerariaId: user.funerariaId,
    };
  }));
};

exports.upsertRole = async function ({ key, name, description = "", permissions = [], active = true }) {
  return ExperimentalRole.findOneAndUpdate(
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
  const role = await ExperimentalRole.findOne({ key, active: true });
  if (!role) {
    const error = new Error("El rol experimental no existe o no esta activo.");
    error.status = 404;
    throw error;
  }

  return ExperimentalUserRole.findOneAndUpdate(
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
  return ExperimentalUserRole.findOneAndUpdate(
    { userId, roleKey: String(roleKey).trim().toLowerCase() },
    { active: false },
    { new: true }
  ).lean();
};
