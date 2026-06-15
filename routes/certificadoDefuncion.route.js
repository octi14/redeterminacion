const express = require("express");
const router = express.Router();

const Controller = require("../controllers/certificadoDefuncion.controller");

// endpoints
router.get("/", Controller.getAll);
router.post("/", Controller.add);
router.put("/:id", Controller.update);
router.delete("/:id", Controller.delete);
router.get("/:id", Controller.getById);
router.get("/documentos/:id", Controller.getDocumentosById);

module.exports = router;


