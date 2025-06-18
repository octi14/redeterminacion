let PagoDoble = require("../models/pagoDoble.model");

exports.findAll = async function () {
  try {
    return await PagoDoble.find().select('-documentos');
  } catch (e) {
    console.error(e);
    throw Error("Error getting objects.");
  }
};

exports.create = async function (formData) {
  try {
    const pago = new PagoDoble(formData);
    const createdPagoDoble = await pago.save();
    return createdPagoDoble;
  } catch (e) {
    // Manejar cualquier error que pueda ocurrir al crear la habilitación
    throw new Error('No se pudo crear el formulario. Detalles del error: ' + e.message);
  }
};

exports.update = async function (id, update) {
  return PagoDoble.findOneAndUpdate({ _id: id }, update, {
    new: true,
  });
};

exports.updateLazy = async function (id, update) {
  return PagoDoble.findOneAndUpdate({ _id: id }, update, {
    new: true,
  }).select('-documentos');
};

exports.delete = async function (id) {
  return PagoDoble.deleteOne({ _id: id });
};

exports.getById = async function (id) {
  return PagoDoble.findById(id);
};
