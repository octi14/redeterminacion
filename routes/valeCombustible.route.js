const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const ValeCombustibleController = require("../controllers/valeCombustible.controller");

router.get("/", ValeCombustibleController.getAll);
router.post("/", ValeCombustibleController.add);
router.post("/single", ValeCombustibleController.getAllByOrden);
// router.put("/:id", ValeCombustibleController.update);
router.delete("/:id", ValeCombustibleController.delete);
module.exports = router;
