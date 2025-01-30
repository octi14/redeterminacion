let OrdenCompra = require("../models/ordenCompra.model");

exports.findAll = async function () {
  try {
    return await OrdenCompra.find();
  } catch (e) {
    console.error(e);
    throw Error("Error getting ordenCompras.");
  }
};

exports.create = async function (ordenCompraData) {
  const file = new OrdenCompra(ordenCompraData);
  await file.save();
  return file;
};

exports.update = async function (id, update) {
  return OrdenCompra.findOneAndUpdate({ _id: id }, update, {
    new: true,
  });
};

exports.getById = async function (id) {
  return OrdenCompra.findById(id);
};

exports.delete = async function (id) {
  return OrdenCompra.deleteOne({ _id: id });
};

exports.getByCategoria = async function (categoria) {
  return OrdenCompra.find({ categoria: categoria });
};

exports.getOrCreate = async function (name) {
  const found = await OrdenCompra.findOne({
    name,
  });
  return (
    found ||
    OrdenCompra.create({
      name,
    })
  );
};
