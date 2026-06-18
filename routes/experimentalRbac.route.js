const express = require("express");
const router = express.Router();

const Controller = require("../controllers/experimentalRbac.controller");
const ExperimentalRbacService = require("../services/experimentalRbac.service");

const requireReadUsers = ExperimentalRbacService.requireAnyPermission(["users.read", "users.manage"]);
const requireManageUsers = ExperimentalRbacService.requirePermission("users.manage");
const requireReadRoles = ExperimentalRbacService.requireAnyPermission(["roles.read", "roles.manage"]);
const requireManageRoles = ExperimentalRbacService.requirePermission("roles.manage");

router.get("/users", requireReadUsers, Controller.listUsers);
router.get("/permissions", requireReadRoles, Controller.listPermissions);
router.get("/roles", requireReadRoles, Controller.listRoles);
router.post("/roles", requireManageRoles, Controller.upsertRole);
router.put("/roles/:key", requireManageRoles, Controller.upsertRole);
router.post("/users/:userId/roles", requireManageUsers, Controller.assignRole);
router.delete("/users/:userId/roles/:roleKey", requireManageUsers, Controller.removeRole);

module.exports = router;
