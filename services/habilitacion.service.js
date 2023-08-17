let Habilitacion = require("../models/habilitacion.model");

// const transformSort = (sort) => {
//   const result = {};
//   Object.entries(sort).forEach((entry) => {
//     const [key, value] = entry;
//     result[key] = value ? 1 : -1;
//   });
//   return result;
// };

exports.findAll = async function () {
  try {
    return await Habilitacion.find().select('-documentos');
  } catch (e) {
    console.error(e);
    throw Error("Error getting objects.");
  }
};

exports.create = async function (formData) {
  try {
    const habilitacion = new Habilitacion(formData);
    const createdHabilitacion = await habilitacion.save();
    return createdHabilitacion;
  } catch (e) {
    // Manejar cualquier error que pueda ocurrir al crear la habilitación
    throw new Error('No se pudo crear la habilitación. Detalles del error: ' + e.message);
  }
};

exports.update = async function (id, update) {
  return Habilitacion.findOneAndUpdate({ _id: id }, update, {
    new: true,
  });
};

exports.updateLazy = async function (id, update) {
  return Habilitacion.findOneAndUpdate({ _id: id }, update, {
    new: true,
  }).select('-documentos');
};


exports.delete = async function (id) {
  return Habilitacion.deleteOne({ _id: id });
};

exports.getById = async function (id) {
  return Habilitacion.findById(id);
};

// exports.getMany = async function (ids) {
//   return Obra.find().where("_id").in(ids);
// };

// exports.search = async function (expediente, objeto, adjudicado) {
//   let query = {};
//   // if (expediente) {
//   //   // // busca cualquier obra por el expediente
//   //   query.expediente = { $regex: expediente, $options: "i" };
//   // }
//   if (objeto) {
//     // busca cualquier obra por el objeto
//     query.objeto = { $regex: objeto, $options: "i" };
//   }
//   // if (adjudicado) {
//   //   // busca cualquier obra por el expediente
//   //   query.adjudicado = { $regex: adjudicado, $options: "i" };
//   // }
//   return Obra.find(query);
// };
