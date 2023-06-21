let Multimedia = require("../models/multimedia.model");

exports.findAll = async function () {
  try {
    return await Multimedia.find();
  } catch (e) {
    console.error(e);
    throw Error("Error getting multimedias.");
  }
};

exports.create = async function (multimediaData) {
  const file = new Multimedia(multimediaData);
  await file.save();
  return file;
};

exports.update = async function (id, update) {
  return Obra.findOneAndUpdate({ _id: id }, update, {
    new: true,
  });
};

exports.getById = async function (id) {
  return Multimedia.findById(id);
};

exports.delete = async function (id) {
  return Multimedia.deleteOne({ _id: id });
};

exports.getByCategoria = async function (categoria) {
  return Multimedia.find({ categoria: categoria });
};

exports.getOrCreate = async function (name) {
  const found = await Multimedia.findOne({
    name,
  });
  return (
    found ||
    Multimedia.create({
      name,
    })
  );
};
