const express = require('express');
const router = express.Router();
const MaestroComercioController = require('../controllers/maestroComercio.controller');
const RbacService = require('../services/experimentalRbac.service');

router.post('/', RbacService.requirePermission('maestroComercial.update'), MaestroComercioController.create);

router.get('/', RbacService.requirePermission('maestroComercial.read'), MaestroComercioController.getAll);
router.post('/single', MaestroComercioController.getSingle);

module.exports = router;