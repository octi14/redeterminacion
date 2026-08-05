const express = require("express");
const router = express.Router();

const MultimediaController = require("../controllers/multimedia.controller");
const RbacService = require("../services/rbac.service");
// const MultimediaValidator = require("../validators/multimedia.validator");

// "/multimedias" endpoints
router.get("/", MultimediaController.getMultimedias);
router.post("/", RbacService.requirePermission("modernizacion.update"), MultimediaController.add);
router.get("/:id", MultimediaController.getById);
router.put("/:id", RbacService.requirePermission("modernizacion.update"), MultimediaController.update);
router.delete("/:id", RbacService.requirePermission("modernizacion.update"), MultimediaController.delete);
router.post("/search", MultimediaController.getByCategoria);

module.exports = router;
