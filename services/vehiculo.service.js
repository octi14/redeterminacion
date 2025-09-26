let Vehiculo = require("../models/vehiculo.model");

exports.findAll = async function () {
  try {
    return await Vehiculo.find();
  } catch (e) {
    console.error(e);
    throw Error("Error getting vehiculos.");
  }
};

exports.create = async function (vehiculoData) {
  const vehiculo = new Vehiculo(vehiculoData);
  await vehiculo.save();
  return vehiculo;
};

exports.update = async function (id, update) {
  return Vehiculo.findOneAndUpdate({ _id: id }, update, {
    new: true,
  });
};

exports.delete = async function (id) {
  return Vehiculo.deleteOne({ _id: id });
};

exports.getById = async function (id) {
  return Vehiculo.findById(id);
};

exports.getByDominio = async function (dominio) {
  return Vehiculo.findOne({ dominio: dominio });
};

exports.search = async function (dominio, area) {
  let query = {};
  if (dominio) {
    query.dominio = { $regex: dominio, $options: "i" };
  }
  if (area) {
    query.area = { $regex: area, $options: "i" };
  }
  return Vehiculo.find(query);
};
