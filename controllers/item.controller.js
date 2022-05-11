let ItemService = require("../services/item.service");

exports.getItems = async function (req, res) {
  try {
    let items = await ItemService.findAll();
    return res.status(200).json({
      data: items,
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
    const { name } = req.body;

    const createdItem = await ItemService.create({ name });
    return res.status(201).json({
      message: "Created",
      data: createdItem,
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

    const updatedItem = await ItemService.update(oldName, {
      name: newName,
    });

    return res.status(200).json({
      message: "Iteme modificado",
      data: updatedItem,
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

    ItemService.delete(name);

    return res.status(200).json({
      message: "Iteme eliminado",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getByName = async function (req, res, next) {
  ItemService.getByName(req.params.name, req.body)
    .then((items) => res.json(items))
    .catch((err) => next(err));
};
