const express = require("express");
const router = express.Router();

const UserController = require("../controllers/user.controller");
const RbacService = require("../services/experimentalRbac.service");

// "/users" endpoints
router.get("/", RbacService.requirePermission("users.read"), UserController.findAll);
router.get("/me", UserController.me);
router.post("/authenticate", UserController.authenticate);
router.post("/verify", UserController.checkToken)
// router.post("/register", UserController.register);
router.post("/changePassword", UserController.changePassword); // Nueva ruta para cambiar la contraseña

module.exports = router;
