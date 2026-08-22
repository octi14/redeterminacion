const fs = require("fs");
const User = require("../models/user.model");

const ALLOWED = ["admin", "master", "true", "boletas", "hacienda"];

function cleanupArchivoTemporal(req) {
  const filePath = req.archivoTemporal && req.archivoTemporal.path;
  if (!filePath) return;
  fs.promises.unlink(filePath).catch(() => {});
  req.archivoTemporal = null;
}

module.exports = async function requirePagoUrbanaAdmin(req, res, next) {
  const fail = (status, body) => {
    cleanupArchivoTemporal(req);
    return res.status(status).json(body);
  };

  try {
    if (!req.auth || !req.auth.sub) {
      return fail(401, { message: "Autenticación requerida." });
    }

    const user = await User.findById(req.auth.sub).select("username admin");
    if (!user) {
      return fail(401, {
        message: "La sesión pertenece a un usuario que ya no existe en esta base. Volvé a iniciar sesión.",
      });
    }

    const legacyRole = String(user.admin || "").trim().toLowerCase();
    if (!ALLOWED.includes(legacyRole)) {
      return fail(403, { message: "Esta operación requiere permisos de Hacienda o boletas." });
    }

    req.authenticatedUser = user;
    return next();
  } catch (error) {
    return fail(500, { message: "No se pudieron verificar los permisos." });
  }
};
