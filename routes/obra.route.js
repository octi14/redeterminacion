const express = require("express");
const router = express.Router();
// const paginationMiddleware = require("express-pagination-middleware");

const ObraController = require("../controllers/obra.controller");
const RbacService = require("../services/experimentalRbac.service");
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
router.get("/", RbacService.requirePermission("obras.read"), ObraController.getAll);
router.post("/", RbacService.requirePermission("obras.update"), ObraController.add);
router.put("/:id", RbacService.requirePermission("obras.update"), ObraController.update);
router.delete("/:id", RbacService.requirePermission("obras.update"), ObraController.delete);
router.get("/:id", RbacService.requirePermission("obras.read"), ObraController.getById);
router.post("/search", RbacService.requirePermission("obras.read"), ObraController.search);
module.exports = router;