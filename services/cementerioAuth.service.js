const User = require('../models/user.model');

exports.getUser = async function (req) {
  const userId = req.user && req.user.sub;
  if (!userId) {
    const error = new Error('Autenticación requerida.');
    error.status = 401;
    throw error;
  }

  const user = await User.findById(userId).select('-password');
  if (!user) {
    const error = new Error('Usuario no encontrado.');
    error.status = 401;
    throw error;
  }
  return user;
};

exports.requireRole = function (user, roles) {
  if (!roles.includes(user.admin)) {
    const error = new Error('No tiene permisos para realizar esta acción.');
    error.status = 403;
    throw error;
  }
};

exports.resolveFunerariaId = function (user, requestedFunerariaId) {
  if (user.admin === 'master') {
    if (!requestedFunerariaId) {
      const error = new Error('Master debe seleccionar una funeraria.');
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
