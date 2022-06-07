let IndiceService = require("../services/indice.service");

exports.getIndices = async function (req, res) {
  try {
    let indices = await IndiceService.findAll();
    return res.status(200).json({
      data: indices,
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
    const { mes, año, categoria, valor } = req.body.indice;

    const indiceData = {
      mes, año, categoria, valor,
    };

    const createdIndice = await IndiceService.create(indiceData);
    return res.status(201).json({
      message: "Created",
      data: createdIndice,
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

    const updatedIndice = await IndiceService.update(oldName, {
      name: newName,
    });

    return res.status(200).json({
      message: "Indice modificado",
      data: updatedIndice,
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

    IndiceService.delete(name);

    return res.status(200).json({
      message: "Indice eliminado",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getByName = async function (req, res, next) {
  IndiceService.getByName(req.params.name, req.body)
    .then((indices) => res.json(indices))
    .catch((err) => next(err));
};
