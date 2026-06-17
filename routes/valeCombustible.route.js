const express = require("express");
const router = express.Router();

const ValeCombustibleController = require("../controllers/valeCombustible.controller");
const RbacService = require("../services/experimentalRbac.service");

router.get("/", RbacService.requirePermission("compras.vales.read"), ValeCombustibleController.getAll);
router.post("/", RbacService.requirePermission("compras.vales.update"), ValeCombustibleController.add);
router.post("/single", RbacService.requirePermission("compras.vales.read"), ValeCombustibleController.getAllByOrden);
router.post("/anular/:id", RbacService.requirePermission("compras.vales.update"), ValeCombustibleController.anular);
router.put("/:id", RbacService.requirePermission("compras.vales.update"), ValeCombustibleController.update);

module.exports = router;
