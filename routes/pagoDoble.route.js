const express = require("express");
const router = express.Router();

const PagoDobleController = require("../controllers/pagoDoble.controller");
const RbacService = require("../services/rbac.service");

// endpoints
router.get("/", RbacService.requirePermission("pagosDobles.read"), PagoDobleController.getAll);
router.post("/", PagoDobleController.add);
router.put("/:id", RbacService.requirePermission("pagosDobles.update"), PagoDobleController.update);
router.put("/lazy/:id", RbacService.requirePermission("pagosDobles.update"), PagoDobleController.updateLazy);
router.delete("/:id", RbacService.requirePermission("pagosDobles.update"), PagoDobleController.delete);
router.get("/:id", RbacService.requirePermission("pagosDobles.read"), PagoDobleController.getById);
router.get("/documentos/:id", RbacService.requirePermission("pagosDobles.read"), PagoDobleController.getDocumentosById);
// router.post("/documentos/delete/:id", PagoDobleController.deleteDocumentosById);
router.post("/nroTramite", PagoDobleController.getByNroTramite);
module.exports = router;
