const express = require("express");
const router = express.Router();

const Controller = require("../controllers/experimentalRbac.controller");
const ExperimentalRbacService = require("../services/experimentalRbac.service");

const requireManageUsers = ExperimentalRbacService.requirePermission("users.manage");

router.get("/users", requireManageUsers, Controller.listUsers);
router.get("/permissions", requireManageUsers, Controller.listPermissions);
router.get("/roles", requireManageUsers, Controller.listRoles);
router.post("/roles", requireManageUsers, Controller.upsertRole);
router.put("/roles/:key", requireManageUsers, Controller.upsertRole);
router.post("/users/:userId/roles", requireManageUsers, Controller.assignRole);
router.delete("/users/:userId/roles/:roleKey", requireManageUsers, Controller.removeRole);

module.exports = router;
