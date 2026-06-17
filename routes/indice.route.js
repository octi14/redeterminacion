const express = require("express");
const router = express.Router();

const IndiceController = require("../controllers/indice.controller");
const RbacService = require("../services/experimentalRbac.service");
// const IndiceValidator = require("../validators/indice.validator");

// "/items" endpoints
router.get("/", RbacService.requirePermission("indices.read"), IndiceController.getIndices);
router.post("/", RbacService.requirePermission("indices.update"), IndiceController.add);
router.put("/:name", RbacService.requirePermission("indices.update"), IndiceController.update);
router.delete("/:name", RbacService.requirePermission("indices.update"), IndiceController.delete);
router.get("/:name", RbacService.requirePermission("indices.read"), IndiceController.getByName);
router.post("/search", RbacService.requirePermission("indices.read"), IndiceController.search);
router.post("/searchSingle", RbacService.requirePermission("indices.read"), IndiceController.searchSingle);
module.exports = router;