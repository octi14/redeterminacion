const express = require("express");
const router = express.Router();

const MultimediaCategoriaController = require("../controllers/multimediacategoria.controller");
// endpoints
router.get("/", MultimediaCategoriaController.getAll);
router.post("/", MultimediaCategoriaController.add);
router.delete("/:name", MultimediaCategoriaController.delete);
module.exports = router;
