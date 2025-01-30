const express = require("express");
const router = express.Router();

const OrdenCompraController = require("../controllers/ordenCompra.controller");

// "/ordenes-compra" endpoints
router.get("/", OrdenCompraController.getAll); // Obtener todas las órdenes de compra
router.post("/", OrdenCompraController.add); // Crear una nueva orden de compra
router.get("/:id", OrdenCompraController.getById); // Obtener una orden de compra por su ID
router.put("/:id", OrdenCompraController.update); // Actualizar una orden de compra por su ID
router.delete("/:id", OrdenCompraController.delete); // Eliminar una orden de compra por su ID

module.exports = router;
