let ObraService = require("../services/obra.service");

exports.getAll = async function (req, res) {
  try {
    const { sort, skip, limit } = req.pagination;
    let recipes = await RecipeService.findAll(sort, skip, limit);
    return res.status(200).json({
      data: recipes,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.add = async function (req, res) {
  try {
    const { sub: user } = req.user;

    // TODO: validate req.body
    const {
      name,
      description,
    } = req.body.obra;

    const obraData = {
      name,
      description,
    };
    const createdRecipe = await RecipeService.create(recipeData);

    return res.status(201).json({
      message: "Created",
      data: createdRecipe,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.update = async function (req, res) {
  try {
    // TODO: validate req.params and req.body
    const { name: originalName } = req.params;
    const { name, description, ingredients, tags } = req.body;
    //const { ingredients: newIngredients } = req.body;

    const updatedRecipe = await RecipeService.update(originalName, {
      name: name,
      description: description,
      ingredients: ingredients,
      tags: tags,
    });

    await IngredientService.create(ingredients);
    await TagService.create(tags);

    return res.status(200).json({
      message: "Receta modificada.",
      data: updatedRecipe,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.delete = async function (req, res) {
  try {
    // TODO: validate req.params
    const { name } = req.params;

    await RecipeService.delete(name);

    return res.status(200).json({
      message: "Receta eliminada.",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getById = async function (req, res) {
  try {
    // TODO: validate req.params
    const { id } = req.params;
    let recipe = await RecipeService.getById(id);
    return res.status(200).json({
      data: recipe,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getByName = async function (req, res) {
  try {
    // TODO: validate req.params
    const { name } = req.params;
    let recipe = await RecipeService.getByName(name);
    return res.status(200).json({
      data: recipe,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
