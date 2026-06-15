let CertificadoDefuncion = require("../models/certificadoDefuncion.model");

exports.findAll = async function (filter = {}) {
  try {
    return await CertificadoDefuncion.find(filter).select('-documentos');
  } catch (e) {
    throw Error("Error getting objects.");
  }
};

exports.create = async function (formData) {
  try {
    const item = new CertificadoDefuncion(formData);
    const created = await item.save();
    return created;
  } catch (e) {
    throw new Error('No se pudo crear el formulario. Detalles: ' + e.message);
  }
};

exports.update = async function (id, update) {
  return CertificadoDefuncion.findOneAndUpdate({ _id: id }, update, { new: true });
};

exports.updateLazy = async function (id, update) {
  return CertificadoDefuncion.findOneAndUpdate({ _id: id }, update, { new: true }).select('-documentos');
};

exports.delete = async function (id) {
  return CertificadoDefuncion.deleteOne({ _id: id });
};

exports.getById = async function (id) {
  return CertificadoDefuncion.findById(id);
};




