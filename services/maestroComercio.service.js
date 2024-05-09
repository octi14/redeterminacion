let MaestroComercio = require("../models/maestroComercio.model");

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
    return await MaestroComercio.find()
    // .sort(transformedSort).skip(skip).limit(limit);
  } catch (e) {
    console.error(e);
    throw Error("Error getting objects.");
  }
};

exports.processCSV = async function(fileContent) {
  const lines = fileContent.split('\n');

  for (let line of lines) {
    const values = line.split(';');

    // Convertir los valores a números solo si son números válidos
    const legajo = isNaN(values[0]) ? null : parseInt(values[0]);
    const cuit = isNaN(values[1]) ? null : parseInt(values[1]);

    const nuevoMaestroComercio = new MaestroComercio({
      legajo,
      cuit,
      denominacion: values[2],
      mail: values[3],
      titular: values[4],
      telefono: values[5],
      dfe: values[6],
    });

    try {
      await nuevoMaestroComercio.save();
    } catch (error) {
      console.error(`Error al guardar MaestroComercio: ${error}`);
    }
  }

  return { message: 'Registros de MaestroComercio creados correctamente' };
};

exports.update = async function (id, update) {
  return Certificado.findOneAndUpdate({ id: id }, update, {
    new: true,
  });
};

exports.delete = async function (id) {
  return Certificado.deleteOne({ id: id });
};

exports.getById = async function (id) {
  return Certificado.findById(id);
};

exports.getMany = async function (ids) {
  return Certificado.find().where("_id").in(ids);
};

exports.search = async function ({cuit, legajo}) {
  console.log(cuit, legajo)
  let query = {};
  if (cuit) {
    // // busca cualquier certificado por el expediente
    query.expediente = { $regex: cuit, $options: "i" };
  }
  if (legajo) {
    // busca cualquier certificado por el objeto
    query.data = { $regex: legajo, $options: "i" };
  }
  // if (adjudicado) {
  //   // busca cualquier certificado por el expediente
  //   query.adjudicado = { $regex: adjudicado, $options: "i" };
  // }
  return MaestroComercio.find({cuit:cuit,legajo:legajo});
};
