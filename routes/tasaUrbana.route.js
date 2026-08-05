const express = require("express");
const Controller = require("../controllers/tasaUrbana.controller");

const router = express.Router();

router.get("/configuracion", Controller.configuracion);
router.get("/:partida", Controller.buscar);
router.post("/:partida/pdf", Controller.descargar);

module.exports = router;
