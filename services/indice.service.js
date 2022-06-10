let Indice = require("../models/indice.model");

exports.findAll = async function () {
  try {
    return await Indice.find();
  } catch (e) {
    console.error(e);
    throw Error("Error getting indices.");
  }
};

exports.create = async function (indiceData) {
  const file = new Indice(indiceData);
  await file.save();
  return file;
};

exports.search = async function (mes, año) {
  let query = {};
    query.mes = { $regex: mes, $options: "i" };
    query.año = { $regex: año, $options: "i" };

  return Indice.find({
    mes: mes,
    año: año,
  });
};

exports.update = async function (name, update) {
  await Indice.ensureIndexes();
  return Indice.findOneAndUpdate({ name: name }, update, {
    new: true,
  });
};

exports.delete = async function (name) {
  return Indice.deleteOne({ name: name });
};

exports.getByName = async function (name) {
  return Indice.find({
    name: name,
  });
};

exports.getOrCreate = async function (name) {
  const found = await Indice.findOne({
    name,
  });
  return (
    found ||
    Indice.create({
      name,
    })
  );
};
