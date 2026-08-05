const express = require("express");
const Controller = require("../controllers/tasaImportacion.controller");
const requireBoletas = require("../middleware/boletas.middleware");
const requireMaster = require("../middleware/master.middleware");
const xlsxTemporal = require("../middleware/xlsxTemporal.middleware");

const router = express.Router();

router.get("/tipos", requireBoletas, Controller.listarTipos);
router.get("/", requireBoletas, Controller.listar);
router.get("/periodos", requireBoletas, Controller.listarPeriodos);
router.put("/periodos/:importacionId/estado", requireMaster, Controller.cambiarEstadoPeriodo);
router.get("/configuracion", requireBoletas, Controller.obtenerConfiguracion);
router.put("/configuracion", requireMaster, Controller.actualizarConfiguracion);
router.get("/:id/progreso", requireBoletas, Controller.progreso);
router.get("/:id", requireBoletas, Controller.obtener);
router.get("/:id/reporte", requireBoletas, Controller.reporte);
router.get("/:id/original", requireMaster, Controller.archivoOriginal);
router.put("/:id/deshabilitar", requireMaster, Controller.deshabilitar);
router.post("/analizar", requireBoletas, xlsxTemporal, Controller.analizar);
router.post("/:id/publicar", requireBoletas, xlsxTemporal, Controller.publicar);

module.exports = router;
