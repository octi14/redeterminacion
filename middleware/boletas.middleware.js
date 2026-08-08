const RbacService = require("../services/rbac.service");

module.exports = RbacService.requirePermission("boletas.manage");
