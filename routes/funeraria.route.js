const express = require('express');
const Controller = require('../controllers/funeraria.controller');

const router = express.Router();

router.get('/', Controller.getAll);
router.get('/usuarios', Controller.listUsers);
router.post('/', Controller.create);
router.put('/:id', Controller.update);
router.put('/:id/usuarios/:userId', Controller.associateUser);

module.exports = router;
