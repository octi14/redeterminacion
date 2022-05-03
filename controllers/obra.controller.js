let ObraService = require("../services/obra.service");

exports.getAll = async function (req, res) {
  try {
    // const { sort, skip, limit } = req.pagination;
    let obras = await ObraService.findAll(
      // sort, skip, limit
      );
    return res.status(200).json({
      data: obras,
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
      expediente,
      objeto,
      presup_oficial,
      adjudicado,
      proveedor,
      cotizacion,
      garantia_contrato,
      adjudicacion,
      contrato,
      fecha_contrato,
      ordenanza,
      decreto,
      plazo_obra,
      anticipo_finan,
    } = req.body.obra;

    const obraData = {
      expediente,
      objeto,
      presup_oficial,
      adjudicado,
      proveedor,
      cotizacion,
      garantia_contrato,
      adjudicacion,
      contrato,
      fecha_contrato,
      ordenanza,
      decreto,
      plazo_obra,
      anticipo_finan,
    };

    console.log(obraData);

    const createdFile = await ObraService.create(obraData);

    return res.status(201).json({
      message: "Created",
      data: createdFile,
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

    await ObraService.delete(name);

    return res.status(200).json({
      message: "Obra eliminada.",
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
    let obra = await ObraService.getById(id);
    return res.status(200).json({
      data: obra,
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
    let obra = await ObraService.getByName(name);
    return res.status(200).json({
      data: obra,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.search = async function (req, res) {
  try {
    const { expediente, objeto, adjudicado } = req.body;
    console.log(expediente,objeto,adjudicado);
    let obras = await ObraService.search(expediente, objeto, adjudicado);
    return res.status(200).json({
      data: obras,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
