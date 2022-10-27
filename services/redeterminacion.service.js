let Redeterminacion = require("../models/redeterminacion.model");

const transformSort = (sort) => {
  const result = {};
  Object.entries(sort).forEach((entry) => {
    const [key, value] = entry;
    result[key] = value ? 1 : -1;
  });
  return result;
};

exports.findAll = async function () {
  try {
    // const transformedSort = transformSort(sort);
    return await Redeterminacion.find()
    // .sort(transformedSort).skip(skip).limit(limit);
  } catch (e) {
    console.error(e);
    throw Error("Error getting objects.");
  }
};

exports.create = async function (redeterminacionData) {
  const file = new Redeterminacion(redeterminacionData);
  await file.save();
  return file;
};

exports.update = async function (id, update) {
  return Redeterminacion.findOneAndUpdate({ id: id }, update, {
    new: true,
  });
};

exports.delete = async function (id) {
  return Redeterminacion.deleteOne({ _id: id });
};

exports.getById = async function (id) {
  return Redeterminacion.findById(id);
};

exports.getByObjeto = async function (objeto) {
  return Redeterminacion.find({ objeto: objeto });
};

exports.getByObra = async function (obra) {
  return Redeterminacion.find({ obra: obra });
};

exports.getMany = async function (ids) {
  return Redeterminacion.find().where("_id").in(ids);
};

exports.search = async function (obra, certificado) {
  let query = {};
  // if (expediente) {
  //   // // busca cualquier Redeterminacion por el expediente
  //   query.expediente = { $regex: expediente, $options: "i" };
  // }
  if (obra) {
    // busca cualquier Redeterminacion por el objeto
    query.obra = obra._id;
  }
  if(certificado) {
    query.certificado = certificado._id;
  }
  // if (adjudicado) {
  //   // busca cualquier Redeterminacion por el expediente
  //   query.adjudicado = { $regex: adjudicado, $options: "i" };
  // }
  return Redeterminacion.find({
    obra: obra.id,
    certificado: certificado.id,
  });
};
