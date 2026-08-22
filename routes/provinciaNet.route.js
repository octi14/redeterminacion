const express = require("express");
const Controller = require("../controllers/provinciaNet.controller");
const requirePagoUrbanaAdmin = require("../middleware/pagoUrbanaAdmin.middleware");
const xlsxTemporal = require("../middleware/xlsxTemporal.middleware");

const router = express.Router();

router.get("/configuracion", Controller.configuracion);
router.put("/configuracion", Controller.actualizarConfiguracion);
// xlsxTemporal primero: si auth hace await antes de leer el body, el stream
// se pierde y el request queda pending para siempre.
router.post(
  "/urbana/importar",
  xlsxTemporal,
  requirePagoUrbanaAdmin,
  Controller.importarUrbana
);
router.get(
  "/urbana/importar/:importId/progreso",
  requirePagoUrbanaAdmin,
  Controller.progresoImportUrbana
);
router.get(
  "/urbana/importaciones",
  requirePagoUrbanaAdmin,
  Controller.listarImportacionesUrbana
);
router.get(
  "/urbana/periodos",
  requirePagoUrbanaAdmin,
  Controller.listarPeriodosUrbana
);
router.put(
  "/urbana/periodos/estado",
  requirePagoUrbanaAdmin,
  Controller.cambiarEstadoPeriodoUrbana
);
router.get("/deuda", Controller.getDeuda);
router.post("/preorder", Controller.createPreorder);
router.get("/estado/:uuid", Controller.getEstado);
router.post("/webhook", Controller.webhook);
router.post("/webhook/success", Controller.webhook);
router.post("/webhook/error", Controller.webhook);

module.exports = router;
