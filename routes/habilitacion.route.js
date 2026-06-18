const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const HabilitacionController = require("../controllers/habilitacion.controller");
const RbacService = require("../services/experimentalRbac.service");

// endpoints
router.get("/", RbacService.requirePermission("habilitaciones.read"), HabilitacionController.getAll);
router.post("/", HabilitacionController.add);
router.put("/:id", RbacService.requireAnyPermission(["habilitaciones.status", "habilitaciones.visibilidad", "habilitaciones.update", "turnos.update"]), HabilitacionController.update);
router.put("/lazy/:id", RbacService.requireAnyPermission(["habilitaciones.status", "habilitaciones.visibilidad", "habilitaciones.update", "turnos.update"]), HabilitacionController.updateLazy);
// router.delete("/:id", ObraController.delete);
router.get("/:id", RbacService.requirePermission("habilitaciones.read"), HabilitacionController.getById);
router.get("/documentos/:id", RbacService.requirePermission("habilitaciones.read"), HabilitacionController.getDocumentosById);
router.post("/documentos/delete/:id", RbacService.requirePermission("habilitaciones.update"), HabilitacionController.deleteDocumentosById);
router.post("/nroTramite", HabilitacionController.getByNroTramite);
// router.post("/search", ObraController.search);
// router.post("/migrar/:id", HabilitacionController.migrarHabilitacion);
module.exports = router;
