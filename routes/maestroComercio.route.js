const express = require('express');
const router = express.Router();
const MaestroComercioController = require('../controllers/maestroComercio.controller');

router.post('/', MaestroComercioController.create);

router.get('/', MaestroComercioController.getAll);
router.post('/single', MaestroComercioController.getSingle);

module.exports = router;
