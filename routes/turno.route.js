const express = require("express");
const router = express.Router();

const TurnoController = require("../controllers/turno.controller");
// const turnoValidator = require("../validators/turno.validator");

// "/turnos" endpoints
router.get("/", TurnoController.getAll);
router.post("/", TurnoController.add);
router.get("/:id", TurnoController.getById);
router.get("/nroTramite/:nroTramite", TurnoController.getByNroTramite);
router.put("/:id", TurnoController.update);
router.delete("/:id", TurnoController.delete);

module.exports = router;
