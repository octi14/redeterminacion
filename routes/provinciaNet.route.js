const express = require("express");
const Controller = require("../controllers/provinciaNet.controller");

const router = express.Router();

router.post("/preorder", Controller.createPreorder);
router.get("/estado/:uuid", Controller.getEstado);
router.post("/webhook", Controller.webhook);
router.post("/webhook/success", Controller.webhook);
router.post("/webhook/error", Controller.webhook);

module.exports = router;
