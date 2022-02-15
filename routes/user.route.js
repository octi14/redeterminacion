const express = require("express");
const router = express.Router();

const UserController = require("../controllers/user.controller");

// "/users" endpoints
router.get("/", UserController.findAll);
router.post("/authenticate", UserController.authenticate);
router.post("/register", UserController.register);

router.get("/:userId", UserController.getProfile);
router.post("/:userId", UserController.updateProfile);

module.exports = router;
