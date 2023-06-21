let MultimediaService = require("../services/multimedia.service");

exports.getMultimedias = async function (req, res) {
  try {
    let multimedias = await MultimediaService.findAll();
    return res.status(200).json({
      data: multimedias,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.add = async function (req, res) {
  try {
    // TODO: validate req.body
    const { nombre, link, categoria } = req.body.multimedia;

    const multimediaData = {
      nombre, link, categoria,
    }
    console.log(multimediaData);

    const createdMultimedia = await MultimediaService.create(multimediaData);
    return res.status(201).json({
      message: "Created",
      data: createdMultimedia,
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
    const { id } = req.params;
    // const obra = await ObraService.getById(id);
    const {
      nombre,
      link,
      categoria,
    } = req.body.multimedia;

    const updated = await MultimediaService.update(id, {
      nombre: nombre,
      link: link,
      categoria: categoria,
    });

    return res.status(200).json({
      message: "Obra modificada.",
      data: updated,
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
    let multimedia = await MultimediaService.getById(id);
    return res.status(200).json({
      data: multimedia,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.delete = async function (req, res) {
  try {
    // TODO: validate req.params and req.body
    const { id } = req.params;

    MultimediaService.delete(id);

    return res.status(200).json({
      message: "Multimedia eliminado",
    });
  } catch (e) {
    return res.status(400).json({
      message: "No se pudo eliminar",
    });
  }
};

exports.getByCategoria = async function (req, res) {
  try {
    // TODO: validate req.params
    const { categoria } = req.body;
    let multimedia = await MultimediaService.getByCategoria(categoria);
    return res.status(200).json({
      data: multimedia,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
