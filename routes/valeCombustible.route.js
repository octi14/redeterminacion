const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const ValeCombustibleController = require("../controllers/valeCombustible.controller");

router.get("/", ValeCombustibleController.getAll);
router.post("/", ValeCombustibleController.add);
router.post("/single", ValeCombustibleController.getAllByOrden);
router.post("/anular/:id", ValeCombustibleController.anular);
router.put("/:id", ValeCombustibleController.update);
module.exports = router;
