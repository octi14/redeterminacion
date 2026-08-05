const express = require("express");
const Controller = require("../controllers/tasaAutomotor.controller");

const router = express.Router();

router.get("/configuracion", Controller.configuracion);
router.get("/:dominio", Controller.buscar);
router.post("/:dominio/pdf", Controller.descargar);

module.exports = router;
