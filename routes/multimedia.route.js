const express = require("express");
const router = express.Router();

const MultimediaController = require("../controllers/multimedia.controller");
// const MultimediaValidator = require("../validators/multimedia.validator");

// "/multimedias" endpoints
router.get("/", MultimediaController.getMultimedias);
router.post("/", MultimediaController.add);
router.get("/:id", MultimediaController.getById);
router.put("/:name", MultimediaController.update);
router.delete("/:id", MultimediaController.delete);
router.post("/search", MultimediaController.getByCategoria);

module.exports = router;
