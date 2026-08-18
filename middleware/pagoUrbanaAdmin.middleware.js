const User = require("../models/user.model");

const ALLOWED = ["admin", "master", "true", "boletas", "hacienda"];

module.exports = async function requirePagoUrbanaAdmin(req, res, next) {
  try {
    if (!req.auth || !req.auth.sub) {
      return res.status(401).json({ message: "Autenticación requerida." });
    }

    const user = await User.findById(req.auth.sub).select("username admin");
    if (!user) {
      return res.status(401).json({
        message: "La sesión pertenece a un usuario que ya no existe en esta base. Volvé a iniciar sesión.",
      });
    }

    const legacyRole = String(user.admin || "").trim().toLowerCase();
    if (!ALLOWED.includes(legacyRole)) {
      return res.status(403).json({ message: "Esta operación requiere permisos de Hacienda o boletas." });
    }

    req.authenticatedUser = user;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "No se pudieron verificar los permisos." });
  }
};
