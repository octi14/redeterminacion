const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const AbiertoAnualController = require("../controllers/abiertoAnual.controller");

// endpoints
router.get("/", AbiertoAnualController.getAll);
router.post("/", AbiertoAnualController.add);
router.post("/:id", AbiertoAnualController.addDocument);
// router.put("/lazy/:id", AbiertoAnualController.updateLazy);
// router.delete("/:id", AbiertoAnualController.delete);
router.put("/:id", AbiertoAnualController.update);
router.get("/:id", AbiertoAnualController.getById);
router.get("/facturas/:id", AbiertoAnualController.getFacturasById);
router.post("/buscar/:cuit", AbiertoAnualController.getByCuitLegajo);
// router.post("/search", ObraController.search);
module.exports = router;
