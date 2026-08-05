const express = require("express");
const router = express.Router();

const TurnoController = require("../controllers/turno.controller");
const RbacService = require("../services/rbac.service");
// const turnoValidator = require("../validators/turno.validator");

// "/turnos" endpoints
router.get("/", RbacService.requirePermission("turnos.read"), TurnoController.getAll);
router.post("/", TurnoController.add);
router.get("/:id", RbacService.requirePermission("turnos.read"), TurnoController.getById);
router.get("/nroTramite/:nroTramite", TurnoController.getByNroTramite);
router.put("/:id", RbacService.requirePermission("turnos.update"), TurnoController.update);
router.delete("/:id", RbacService.requirePermission("turnos.update"), TurnoController.delete);

module.exports = router;
