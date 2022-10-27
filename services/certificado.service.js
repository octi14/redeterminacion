let Certificado = require("../models/certificado.model");

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
    return await Certificado.find()
    // .sort(transformedSort).skip(skip).limit(limit);
  } catch (e) {
    console.error(e);
    throw Error("Error getting objects.");
  }
};

exports.create = async function (certificadoData) {
  const file = new Certificado(certificadoData);
  await file.save();
  return file;
};

exports.update = async function (id, update) {
  return Certificado.findOneAndUpdate({ _id: id }, update, {
    new: true,
  });
};

exports.delete = async function (id) {
  return Certificado.deleteOne({ _id: id });
};

exports.getById = async function (id) {
  return Certificado.findById(id);
};

exports.getByObjeto = async function (objeto) {
  return Certificado.find({ objeto: objeto });
};

exports.getByObra = async function (obra) {
  return Certificado.find({ obra: obra });
};

exports.getMany = async function (ids) {
  return Certificado.find().where("_id").in(ids);
};

exports.search = async function (obra) {
  let query = {};
  // if (expediente) {
  //   // // busca cualquier certificado por el expediente
  //   query.expediente = { $regex: expediente, $options: "i" };
  // }
  if (obra) {
    // busca cualquier certificado por el objeto
    query.obra = { $regex: obra, $options: "i" };
  }
  // if (adjudicado) {
  //   // busca cualquier certificado por el expediente
  //   query.adjudicado = { $regex: adjudicado, $options: "i" };
  // }
  return Certificado.find(query);
};
