let OrdenCompra = require("../models/ordenCompra.model");
let mongoose = require('mongoose');

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
  return await OrdenCompra.findById(id);
};

exports.delete = async function (id) {
  return OrdenCompra.deleteOne({ _id: id });
};

exports.findByValeId = async function (valeId) {
  try {
    const objectIdVale = new mongoose.Types.ObjectId(valeId); // Convertimos el ID a ObjectId
    return await OrdenCompra.findOne({ vales: objectIdVale });
  } catch (error) {
    throw new Error("Error al buscar la orden de compra por ID de vale: " + error.message);
  }
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
