const express = require('express');
const Config = require('../models/configs.model');
const RbacService = require('../services/rbac.service');
const {
  loadConfigs,
  getAbiertoAnualPeriodosForFront,
  updateAbiertoAnualPeriodos,
  getGeneralConfig,
  updateGeneralConfig,
} = require('../services/configs.service');
const router = express.Router();

router.get('/general', RbacService.requirePermission('system.config.admin'), async (req, res) => {
  try {
    const data = await getGeneralConfig();
    res.status(200).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.put('/general', RbacService.requirePermission('system.config.admin'), async (req, res) => {
  try {
    await updateGeneralConfig(req.body);
    const data = await getGeneralConfig();
    res.status(200).json({ message: 'Configuracion general actualizada.', data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.get('/abiertoAnualPeriodos', async (req, res) => {
  try {
    const data = await getAbiertoAnualPeriodosForFront();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/abiertoAnualPeriodos', RbacService.requirePermission('abiertoAnual.admin'), async (req, res) => {
  try {
    const updatedConfig = await updateAbiertoAnualPeriodos(req.body);
    const data = await getAbiertoAnualPeriodosForFront();
    res.status(200).json({ message: 'Configuracion de abierto anual actualizada.', data, config: updatedConfig });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.put('/update', RbacService.requirePermission('system.config.admin'), async (req, res) => {
  try {
    const { key, value } = req.body;
    const updatedConfig = await Config.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );

    // Recargar las configuraciones en caché
    await loadConfigs();

    res.status(200).json({ message: 'Configuración actualizada.', data: updatedConfig });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
