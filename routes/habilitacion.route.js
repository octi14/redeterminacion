const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const HabilitacionController = require("../controllers/habilitacion.controller");

// endpoints
router.get("/", HabilitacionController.getAll);
router.post("/", HabilitacionController.add);
router.put("/:id", HabilitacionController.update);
// router.delete("/:id", ObraController.delete);
// router.get("/:id", ObraController.getById);
// router.post("/search", ObraController.search);
module.exports = router;
