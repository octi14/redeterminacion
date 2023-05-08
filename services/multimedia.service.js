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

exports.update = async function (name, update) {
  await Multimedia.ensureIndexes();
  return Multimedia.findOneAndUpdate({ name: name }, update, {
    new: true,
  });
};

exports.delete = async function (name) {
  return Multimedia.deleteOne({ name: name });
};

exports.getByName = async function (name) {
  return Multimedia.find({
    name: name,
  });
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
