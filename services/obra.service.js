let Obra = require("../models/obra.model");

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
    return await Obra.find()
    // .sort(transformedSort).skip(skip).limit(limit);
  } catch (e) {
    console.error(e);
    throw Error("Error getting objects.");
  }
};

exports.create = async function (obraData) {
  const file = new Obra(obraData);
  await file.save();
  return file;
};

exports.update = async function (id, update) {
  return Obra.findOneAndUpdate({ id: id }, update, {
    new: true,
  });
};

exports.delete = async function (id) {
  return Obra.deleteOne({ id: id });
};

exports.getById = async function (id) {
  return Obra.findById(id);
};

exports.getByObjeto = async function (objeto) {
  return Obra.find({ objeto: objeto });
};

exports.getMany = async function (ids) {
  return Obra.find().where("_id").in(ids);
};

exports.search = async function (expediente, objeto, adjudicado) {
  let query = {};
  // if (expediente) {
  //   // // busca cualquier obra por el expediente
  //   query.expediente = { $regex: expediente, $options: "i" };
  // }
  if (objeto) {
    // busca cualquier obra por el objeto
    query.objeto = { $regex: objeto, $options: "i" };
  }
  // if (adjudicado) {
  //   // busca cualquier obra por el expediente
  //   query.adjudicado = { $regex: adjudicado, $options: "i" };
  // }
  return Obra.find(query);
};
