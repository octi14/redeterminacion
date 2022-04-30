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
    const obras = await Obra.find();
    console.log(obras);
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

exports.update = async function (name, update) {
  return Recipe.findOneAndUpdate({ name: name }, update, {
    new: true,
  });
};

exports.delete = async function (name) {
  return Obra.deleteOne({ name: name });
};

exports.getById = async function (id) {
  return Obra.findById(id);
};

exports.getByName = async function (name) {
  return Obra.find({ name: { $regex: name } });
};

exports.getMany = async function (ids) {
  return Obra.find().where("_id").in(ids);
};
