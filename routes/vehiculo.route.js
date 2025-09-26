const express = require("express");
const router = express.Router();

const VehiculoController = require("../controllers/vehiculo.controller");

// "/vehiculos" endpoints
router.get("/", VehiculoController.getAll);
router.post("/", VehiculoController.add);
router.put("/:id", VehiculoController.update);
router.delete("/:id", VehiculoController.delete);
router.get("/:id", VehiculoController.getById);
router.get("/dominio/:dominio", VehiculoController.getByDominio);
router.post("/search", VehiculoController.search);

module.exports = router;
