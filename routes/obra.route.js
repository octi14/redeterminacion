const express = require("express");
const router = express.Router();
const paginationMiddleware = require("express-pagination-middleware");

const ObraController = require("../controllers/obra.controller");
const {
  userValidationMiddleware: UserValidator,
} = require("../validators/middleware");
const RecipePagination = paginationMiddleware({
  sort: {
    validKeys: ["createdAt", "name"],
    default: "-createdAt",
  },
});

// "/recipes" endpoints
router.get("/", RecipePagination, ObraController.getAll);
router.post("/", UserValidator, ObraValidator.create, RecipeController.add);
router.put("/:name", RecipeController.update);
router.delete("/:name", RecipeController.delete);
router.get("/:id", RecipeController.getById);
router.get("/get/:name", RecipeController.getByName);

module.exports = router;
