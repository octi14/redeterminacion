const express = require("express");
const router = express.Router();

const OrdenCompraController = require("../controllers/ordenCompra.controller");
const RbacService = require("../services/rbac.service");

router.get("/", RbacService.requirePermission("compras.ordenes.read"), OrdenCompraController.getAll);
router.post("/", OrdenCompraController.add);
router.get("/:id", RbacService.requirePermission("compras.ordenes.read"), OrdenCompraController.getById);
router.put("/:id", OrdenCompraController.update);
router.delete("/:id", OrdenCompraController.delete);

module.exports = router;
