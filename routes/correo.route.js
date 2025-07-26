const express = require('express');
const router = express.Router();

const correoController = require('../controllers/correo.controller');

// Ruta para enviar un correo de prueba
router.post('/mailer', correoController.enviarCorreo);

module.exports = router;
