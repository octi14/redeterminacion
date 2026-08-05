const express = require("express");
const router = express.Router();

const Controller = require("../controllers/rbac.controller");
const RbacService = require("../services/rbac.service");

const requireReadUsers = RbacService.requireAnyPermission(["users.read", "users.manage"]);
const requireManageUsers = RbacService.requirePermission("users.manage");
const requireReadRoles = RbacService.requireAnyPermission(["roles.read", "roles.manage"]);
const requireManageRoles = RbacService.requirePermission("roles.manage");

router.get("/users", requireReadUsers, Controller.listUsers);
router.get("/permissions", requireReadRoles, Controller.listPermissions);
router.get("/roles", requireReadRoles, Controller.listRoles);
router.post("/roles", requireManageRoles, Controller.upsertRole);
router.put("/roles/:key", requireManageRoles, Controller.upsertRole);
router.post("/users/:userId/roles", requireManageUsers, Controller.assignRole);
router.delete("/users/:userId/roles/:roleKey", requireManageUsers, Controller.removeRole);

module.exports = router;
