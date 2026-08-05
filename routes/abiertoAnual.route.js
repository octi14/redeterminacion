const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const AbiertoAnualController = require("../controllers/abiertoAnual.controller");
const RbacService = require("../services/rbac.service");

const requireRead = RbacService.requirePermission("abiertoAnual.read");
const requireUpdate = RbacService.requirePermission("abiertoAnual.update");

// endpoints
router.get("/", requireRead, AbiertoAnualController.getAll);
router.post("/", AbiertoAnualController.add);
router.post("/:id", AbiertoAnualController.addDocument);
// router.put("/lazy/:id", AbiertoAnualController.updateLazy);
// router.delete("/:id", AbiertoAnualController.delete);
router.put("/:id", requireUpdate, AbiertoAnualController.update);
router.get("/:id", requireRead, AbiertoAnualController.getById);
router.get("/facturas/:id", requireRead, AbiertoAnualController.getFacturasById);
router.post("/buscar/:cuit", AbiertoAnualController.getByCuitLegajo);
// router.post("/search", ObraController.search);
module.exports = router;