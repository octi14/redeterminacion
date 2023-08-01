const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const HabilitacionController = require("../controllers/habilitacion.controller");

// endpoints
router.get("/", HabilitacionController.getAll);
router.post("/", HabilitacionController.add);
router.put("/:id", HabilitacionController.update);
// router.delete("/:id", ObraController.delete);
router.get("/:id", HabilitacionController.getById);
router.post("/nroTramite", HabilitacionController.getByNroTramite);
// router.post("/search", ObraController.search);
module.exports = router;
