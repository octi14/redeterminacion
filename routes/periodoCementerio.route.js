const express = require('express');
const Controller = require('../controllers/periodoCementerio.controller');

const router = express.Router();

router.get('/', Controller.getAll);
router.get('/mis-periodos', Controller.getMine);
router.get('/:id', Controller.getById);
router.post('/:id/confirmar', Controller.confirm);
router.put('/:periodoId/fallecidos/:fallecidoId/revision', Controller.reviewIndividual);
router.put('/:periodoId/revision-pago-mensual', Controller.reviewMonthly);
router.put('/:id/resolver', Controller.resolve);

module.exports = router;
