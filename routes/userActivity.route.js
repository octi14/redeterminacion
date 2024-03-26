const express = require('express');
const router = express.Router();

const userActivityController = require('../controllers/userActivity.controller');

// Ruta para crear una nueva actividad de usuario
router.post('/user-activity', userActivityController.createUserActivity);

module.exports = router;