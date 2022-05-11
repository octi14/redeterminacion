const express = require("express");
const router = express.Router();

const ItemController = require("../controllers/item.controller");
const ItemValidator = require("../validators/item.validator");

// "/items" endpoints
router.get("/", ItemController.getItems);
router.post("/", ItemValidator.create, ItemController.add);
router.put("/:name", ItemController.update);
router.delete("/:name", ItemController.delete);
router.get("/:name", ItemController.getByName);

module.exports = router;
