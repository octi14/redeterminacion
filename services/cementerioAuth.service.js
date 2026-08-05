const User = require('../models/user.model');
const RbacService = require('./rbac.service');

exports.getUser = async function (req) {
  const userId = req.user && req.user.sub;
  if (!userId) {
    const error = new Error('Autenticacion requerida.');
    error.status = 401;
    throw error;
  }

  const user = await User.findById(userId).select('-password');
  if (!user) {
    const error = new Error('Usuario no encontrado.');
    error.status = 401;
    throw error;
  }

  user.access = await RbacService.resolveForUser(user);
  return user;
};

exports.hasPermission = function (user, permission) {
  return RbacService.can((user.access && user.access.permissions) || [], permission);
};

exports.requirePermission = function (user, permission) {
  if (!exports.hasPermission(user, permission)) {
    const error = new Error('No tiene permisos para realizar esta accion.');
    error.status = 403;
    throw error;
  }
};

exports.requireAnyPermission = function (user, permissions) {
  if (!permissions.some((permission) => exports.hasPermission(user, permission))) {
    const error = new Error('No tiene permisos para realizar esta accion.');
    error.status = 403;
    throw error;
  }
};

exports.canAccessAllCemetery = function (user) {
  return exports.hasPermission(user, '*') ||
    exports.hasPermission(user, 'cementerio.review') ||
    exports.hasPermission(user, 'cementerio.admin');
};

exports.resolveFunerariaId = function (user, requestedFunerariaId) {
  if (exports.canAccessAllCemetery(user)) {
    if (!requestedFunerariaId) {
      const error = new Error('Debe seleccionar una funeraria.');
      error.status = 400;
      throw error;
    }
    return requestedFunerariaId;
  }

  if (!user.funerariaId) {
    const error = new Error('El usuario no tiene una funeraria asociada.');
    error.status = 400;
    throw error;
  }
  return user.funerariaId;
};

exports.ensureFunerariaAccess = function (user, funerariaId) {
  if (exports.canAccessAllCemetery(user)) return;
  if (String(funerariaId) !== String(user.funerariaId)) {
    const error = new Error('No tiene acceso a este registro.');
    error.status = 403;
    throw error;
  }
};
