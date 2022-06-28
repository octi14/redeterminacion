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
    // if(categoria != null){
    //   query.categoria = categoria
    // }
  return Indice.find({
    mes: mes,
    año: año,
  });
};

exports.searchSingle = async function (mes, año, categoria) {
  // let query = {};
  //   query.mes = mes;
  //   query.año = año;
  //   if(categoria != null){
  //     query.categoria = categoria
  //   }
  //   console.log(query);
  return Indice.findOne({
    mes: mes,
    año: año,
    categoria: categoria.id,
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
