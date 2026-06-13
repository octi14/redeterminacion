const express = require("express");
const Controller = require("../controllers/tasaImportacion.controller");
const requireMaster = require("../middleware/master.middleware");

const router = express.Router();
const xlsxBody = express.raw({
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  limit: "60mb",
});

router.use(requireMaster);
router.get("/", Controller.listar);
router.get("/periodos", Controller.listarPeriodos);
router.put("/periodos/:importacionId/estado", Controller.cambiarEstadoPeriodo);
router.get("/configuracion", Controller.obtenerConfiguracion);
router.put("/configuracion", Controller.actualizarConfiguracion);
router.get("/:id", Controller.obtener);
router.get("/:id/reporte", Controller.reporte);
router.post("/analizar", xlsxBody, Controller.analizar);
router.post("/:id/publicar", xlsxBody, Controller.publicar);

module.exports = router;
