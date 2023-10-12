const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const HabilitacionController = require("../controllers/habilitacion.controller");

// endpoints
router.get("/", HabilitacionController.getAll);
router.post("/", HabilitacionController.add);
router.put("/:id", HabilitacionController.update);
router.put("/lazy/:id", HabilitacionController.updateLazy);
// router.delete("/:id", ObraController.delete);
router.get("/:id", HabilitacionController.getById);
router.get("/documentos/:id", HabilitacionController.getDocumentosById);
router.post("/documentos/delete/:id", HabilitacionController.deleteDocumentosById);
router.post("/nroTramite", HabilitacionController.getByNroTramite);
// router.post("/search", ObraController.search);
module.exports = router;
