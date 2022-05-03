const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const ObraController = require("../controllers/obra.controller");
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
router.get("/", ObraController.getAll);
router.post("/", ObraController.add);
router.put("/:name", ObraController.update);
router.delete("/:name", ObraController.delete);
router.get("/:id", ObraController.getById);
router.post("/search", ObraController.getByObjeto);
module.exports = router;
