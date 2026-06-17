const RbacService = require('../services/experimentalRbac.service');

module.exports = RbacService.requirePermission('users.manage');