const express = require("express");
const router = express.Router();

const UserController = require("../controllers/user.controller");

// "/users" endpoints
router.get("/", UserController.findAll);
router.post("/authenticate", UserController.authenticate);
router.post("/verify", UserController.checkToken)
// router.post("/register", UserController.register);
router.post("/changePassword", UserController.changePassword); // Nueva ruta para cambiar la contraseña

module.exports = router;
