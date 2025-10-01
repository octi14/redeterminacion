const express = require('express');
const router = express.Router();

const UserActivityController = require('../controllers/userActivity.controller');

// Ruta para crear una nueva actividad de usuario
router.post('/user-activity', UserActivityController.createUserActivity);

// Ruta para obtener todas las actividades de usuario
router.get('/', UserActivityController.getAllUserActivities);

module.exports = router;

