const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const CertificadoController = require("../controllers/certificado.controller");
// const {
//   userValidationMiddleware: UserValidator,
// } = require("../validators/middleware");
// const FilePagination = paginationMiddleware({
//   sort: {
//     validKeys: ["createdAt", "name"],
//     default: "-createdAt",
//   },
// });

// "/obras" endpoints
router.get("/", CertificadoController.getAll);
router.post("/", CertificadoController.add);
router.put("/:id", CertificadoController.update);
router.delete("/:name", CertificadoController.delete);
router.get("/:id", CertificadoController.getById);
// router.post("/search", ObraController.search);
module.exports = router;
