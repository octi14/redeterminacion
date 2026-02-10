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

/**
 * Agrega IDs de vales y una observación a la orden (solo $push; no toca saldoRestante).
 * @param {string} ordenId - ID de la orden
 * @param {Array} valeIds - Array de ObjectId de vales
 * @param {string} observacion - Texto de la observación a agregar
 * @returns {Promise<object|null>} Orden actualizada o null
 */
exports.agregarValesYObservacion = async function (ordenId, valeIds, observacion) {
  const pushOp = {};
  if (valeIds && valeIds.length) pushOp.vales = { $each: valeIds };
  if (observacion != null && observacion !== '') pushOp.observaciones = observacion;
  if (Object.keys(pushOp).length === 0) return await OrdenCompra.findById(ordenId);
  return await OrdenCompra.findOneAndUpdate(
    { _id: ordenId },
    { $push: pushOp },
    { new: true }
  );
};
