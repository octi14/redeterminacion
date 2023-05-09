let MultimediaCategoriaService = require("../services/multimediacategoria.service");

exports.getAll = async function (req, res) {
  try {
    // const { sort, skip, limit } = req.pagination;
    let multimediacategorias = await MultimediaCategoriaService.findAll(
      // sort, skip, limit
      );
    return res.status(200).json({
      data: multimediaCategorias,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.add = async function (req, res) {
  try {
    // const { sub: user } = req.user;

    // TODO: validate req.body
    const {
      nombre,
    } = req.body;

    const multimediaCategoriaData = {
      nombre,
    };



    const createdFile = await MultimediaCategoriaService.create(multimediaCategoriaData);

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

exports.delete = async function (req, res) {
  try {
    // TODO: validate req.params
    const { id } = req.params;

    await MultimediaCategoriaService.delete(id);

    return res.status(200).json({
      message: "Certificado eliminada.",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
