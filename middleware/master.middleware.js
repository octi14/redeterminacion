const User = require("../models/user.model");

module.exports = async function requireMaster(req, res, next) {
  try {
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ message: "Autenticación requerida." });
    }

    const user = await User.findById(req.user.sub).select("username admin");
    if (!user || user.admin !== "master") {
      return res.status(403).json({ message: "Esta operación requiere permisos de administrador master." });
    }

    req.authenticatedUser = user;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "No se pudieron verificar los permisos." });
  }
};
