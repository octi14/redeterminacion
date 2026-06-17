const express = require('express');
const router = express.Router();

const UserActivityController = require('../controllers/userActivity.controller');
const RbacService = require('../services/experimentalRbac.service');

// Ruta para crear una nueva actividad de usuario
router.post('/user-activity', UserActivityController.createUserActivity);

// Ruta para obtener todas las actividades de usuario
router.get('/', RbacService.requirePermission('activities.read'), UserActivityController.getAllUserActivities);

module.exports = router;