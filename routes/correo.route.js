const express = require('express');
const router = express.Router();

const correoController = require('../controllers/correo.controller');
const RbacService = require('../services/experimentalRbac.service');

// Ruta para enviar un correo de prueba
router.post('/mailer', correoController.enviarCorreo);
router.get('/mailer/templates', RbacService.requirePermission('system.config.admin'), correoController.listarPlantillas);
router.put('/mailer/templates/:key', RbacService.requirePermission('system.config.admin'), correoController.actualizarPlantilla);
router.post('/mailer/templates/:key/preview', RbacService.requirePermission('system.config.admin'), correoController.previsualizarPlantilla);

module.exports = router;
