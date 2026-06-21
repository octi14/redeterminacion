const express = require("express");
const TasaCatalogo = require("../services/tasaCatalogo.service");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    res.status(200).json({ data: await TasaCatalogo.listarConConfig() });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

module.exports = router;
