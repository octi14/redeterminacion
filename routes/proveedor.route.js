const express = require("express");
const router = express.Router();

const ProveedorController = require("../controllers/proveedor.controller");

router.get("/", ProveedorController.getAll);
module.exports = router;
