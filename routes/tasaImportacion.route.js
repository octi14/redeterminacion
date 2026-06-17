const express = require("express");
const Controller = require("../controllers/tasaImportacion.controller");
const RbacService = require("../services/experimentalRbac.service");
const xlsxTemporal = require("../middleware/xlsxTemporal.middleware");

const router = express.Router();

router.use(RbacService.requirePermission("boletas.manage"));
router.get("/tipos", Controller.listarTipos);
router.get("/", Controller.listar);
router.get("/periodos", Controller.listarPeriodos);
router.put("/periodos/:importacionId/estado", Controller.cambiarEstadoPeriodo);
router.get("/configuracion", Controller.obtenerConfiguracion);
router.put("/configuracion", Controller.actualizarConfiguracion);
router.get("/:id/progreso", Controller.progreso);
router.get("/:id", Controller.obtener);
router.get("/:id/reporte", Controller.reporte);
router.get("/:id/original", Controller.archivoOriginal);
router.put("/:id/deshabilitar", Controller.deshabilitar);
router.post("/analizar", xlsxTemporal, Controller.analizar);
router.post("/:id/publicar", xlsxTemporal, Controller.publicar);

module.exports = router;
