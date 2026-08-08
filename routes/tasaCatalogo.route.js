const express = require("express");
const TasaCatalogo = require("../services/tasaCatalogo.service");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const data = await TasaCatalogo.listarConConfig();
    res.status(200).json({ data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
