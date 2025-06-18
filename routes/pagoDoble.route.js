const express = require("express");
const router = express.Router();

const PagoDobleController = require("../controllers/pagoDoble.controller");

// endpoints
router.get("/", PagoDobleController.getAll);
router.post("/", PagoDobleController.add);
router.put("/:id", PagoDobleController.update);
router.put("/lazy/:id", PagoDobleController.updateLazy);
router.delete("/:id", ObraController.delete);
router.get("/:id", PagoDobleController.getById);
router.get("/documentos/:id", PagoDobleController.getDocumentosById);
// router.post("/documentos/delete/:id", PagoDobleController.deleteDocumentosById);
router.post("/nroTramite", PagoDobleController.getByNroTramite);
module.exports = router;
