const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const RedeterminacionController = require("../controllers/redeterminacion.controller");
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
router.get("/", RedeterminacionController.getAll);
router.post("/", RedeterminacionController.add);
router.put("/:id", RedeterminacionController.update);
router.delete("/:name", RedeterminacionController.delete);
router.get("/:id", RedeterminacionController.getById);
router.post("/search", RedeterminacionController.search);
module.exports = router;
