const express = require("express");
const Controller = require("../controllers/provinciaNet.controller");
const requirePagoUrbanaAdmin = require("../middleware/pagoUrbanaAdmin.middleware");
const xlsxTemporal = require("../middleware/xlsxTemporal.middleware");

const router = express.Router();

router.get("/configuracion", Controller.configuracion);
router.put("/configuracion", Controller.actualizarConfiguracion);
router.post(
  "/urbana/importar",
  requirePagoUrbanaAdmin,
  xlsxTemporal,
  Controller.importarUrbana
);
router.get("/deuda", Controller.getDeuda);
router.post("/preorder", Controller.createPreorder);
router.get("/estado/:uuid", Controller.getEstado);
router.post("/webhook", Controller.webhook);
router.post("/webhook/success", Controller.webhook);
router.post("/webhook/error", Controller.webhook);

module.exports = router;
