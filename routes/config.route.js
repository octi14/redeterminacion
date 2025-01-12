const express = require('express');
const Config = require('../models/configs.model');
const { loadConfigs } = require('../services/configs.service');
const router = express.Router();

router.put('/update', async (req, res) => {
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