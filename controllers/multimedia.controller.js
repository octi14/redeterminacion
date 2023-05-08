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
    const { name, link } = req.body;

    const multimediaData = {
      name, link
    },

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
    const { name: oldName } = req.params;
    const { name: newName } = req.body;

    const updatedMultimedia = await MultimediaService.update(oldName, {
      name: newName,
    });

    return res.status(200).json({
      message: "Multimedia modificado",
      data: updatedMultimedia,
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
    const { name } = req.params;

    MultimediaService.delete(name);

    return res.status(200).json({
      message: "Multimedia eliminado",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getByName = async function (req, res, next) {
  MultimediaService.getByName(req.params.name, req.body)
    .then((multimedias) => res.json(multimedias))
    .catch((err) => next(err));
};
