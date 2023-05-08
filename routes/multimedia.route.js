const express = require("express");
const router = express.Router();

const MultimediaController = require("../controllers/multimedia.controller");
const MultimediaValidator = require("../validators/multimedia.validator");

// "/multimedias" endpoints
router.get("/", MultimediaController.getMultimedias);
router.post("/", MultimediaValidator.create, MultimediaController.add);
// router.put("/:name", MultimediaController.update);
router.delete("/:name", MultimediaController.delete);
// router.get("/:name", MultimediaController.getByName);

module.exports = router;
