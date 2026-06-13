const express = require("express");
const TasaCatalogo = require("../services/tasaCatalogo.service");

const router = express.Router();

router.get("/", (_req, res) => res.status(200).json({ data: TasaCatalogo.listar() }));

module.exports = router;
