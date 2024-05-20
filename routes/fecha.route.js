const express = require("express");
const router = express.Router();

const FechaController = require("../controllers/fecha.controller");

// "/users" endpoints
router.get("/", FechaController.get);

module.exports = router;
