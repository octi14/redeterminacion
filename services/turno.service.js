let Turno = require("../models/turno.model");

exports.findAll = async function () {
  try {
    return await Turno.find();
  } catch (e) {
    console.error(e);
    throw Error("Error getting turnos.");
  }
};

exports.create = async function (turnoData) {
  const file = new Turno(turnoData);
  await file.save();
  return file;
};

exports.update = async function (id, update) {
  return Turno.findOneAndUpdate({ _id: id }, update, {
    new: true,
  });
};

exports.getById = async function (id) {
  return Turno.findById(id);
};

exports.delete = async function (id) {
  return Turno.deleteOne({ _id: id });
};

exports.getOrCreate = async function (name) {
  const found = await Turno.findOne({
    name,
  });
  return (
    found ||
    Turno.create({
      name,
    })
  );
};
