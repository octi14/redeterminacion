const express = require("express");
const router = express.Router();

const VehiculoController = require("../controllers/vehiculo.controller");
const RbacService = require("../services/experimentalRbac.service");

router.get("/", RbacService.requirePermission("compras.vehiculos.manage"), VehiculoController.getAll);
router.post("/", RbacService.requirePermission("compras.vehiculos.manage"), VehiculoController.add);
router.put("/:id", RbacService.requirePermission("compras.vehiculos.manage"), VehiculoController.update);
router.delete("/:id", RbacService.requirePermission("compras.vehiculos.manage"), VehiculoController.delete);
router.get("/dominio/:dominio", RbacService.requirePermission("compras.vehiculos.manage"), VehiculoController.getByDominio);
router.get("/:id", RbacService.requirePermission("compras.vehiculos.manage"), VehiculoController.getById);
router.post("/search", RbacService.requirePermission("compras.vehiculos.manage"), VehiculoController.search);

module.exports = router;
