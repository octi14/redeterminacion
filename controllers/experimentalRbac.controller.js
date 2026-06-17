const ExperimentalRbacService = require("../services/experimentalRbac.service");
const { PERMISSIONS } = require("../config/experimentalPermissions");

function handleError(res, error) {
  return res.status(error.status || 400).json({
    message: error.message,
  });
}

exports.listRoles = async function (_req, res) {
  try {
    const roles = await ExperimentalRbacService.listRoles();
    return res.status(200).json({ data: roles });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listPermissions = function (_req, res) {
  return res.status(200).json({
    data: Object.values(PERMISSIONS),
  });
};

exports.listUsers = async function (_req, res) {
  try {
    const users = await ExperimentalRbacService.listUsersWithAccess();
    return res.status(200).json({ data: users });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.upsertRole = async function (req, res) {
  try {
    const role = await ExperimentalRbacService.upsertRole({
      ...req.body,
      key: req.params.key || req.body.key,
    });
    return res.status(200).json({ data: role });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.assignRole = async function (req, res) {
  try {
    const assignedBy = req.currentUser
      ? { id: req.currentUser._id, username: req.currentUser.username }
      : undefined;
    const assignment = await ExperimentalRbacService.assignRole({
      userId: req.params.userId,
      roleKey: req.body.roleKey,
      assignedBy,
    });
    return res.status(200).json({ data: assignment });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.removeRole = async function (req, res) {
  try {
    const assignment = await ExperimentalRbacService.removeRole({
      userId: req.params.userId,
      roleKey: req.params.roleKey,
    });
    return res.status(200).json({ data: assignment });
  } catch (error) {
    return handleError(res, error);
  }
};
