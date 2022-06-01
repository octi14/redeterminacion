const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const CategoriaController = require("../controllers/categoria.controller");
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
router.get("/", CategoriaController.getAll);
router.post("/", CategoriaController.add);
router.put("/:id", CategoriaController.update);
router.delete("/:name", CategoriaController.delete);
router.get("/:id", CategoriaController.getById);
// router.post("/search", CertificadoController.search);
module.exports = router;
