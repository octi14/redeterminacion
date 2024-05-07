const express = require('express');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();
const MaestroComercioController = require('../controllers/maestroComercio.controller');

// Configuración de multer para manejar la carga de archivos
const upload = multer({ dest: 'uploads/' });

router.post('/', MaestroComercioController.create);

router.get('/', MaestroComercioController.getAll);

module.exports = router;
