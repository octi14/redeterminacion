const express = require("express");
const router = express.Router();

const IndiceController = require("../controllers/indice.controller");
// const IndiceValidator = require("../validators/indice.validator");

// "/items" endpoints
router.get("/", IndiceController.getIndices);
router.post("/", IndiceController.add);
router.put("/:name", IndiceController.update);
router.delete("/:name", IndiceController.delete);
router.get("/:name", IndiceController.getByName);
router.post("/search", IndiceController.search);
router.post("/searchSingle", IndiceController.searchSingle);
module.exports = router;
