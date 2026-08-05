let AbiertoAnual = require("../models/abiertoAnual.model");

// const transformSort = (sort) => {
//   const result = {};
//   Object.entries(sort).forEach((entry) => {
//     const [key, value] = entry;
//     result[key] = value ? 1 : -1;
//   });
//   return result;
// };

exports.findAll = async function () {
  try {
    return await AbiertoAnual.find();
  } catch (e) {
    console.error(e);
    throw Error("Error getting objects.");
  }
};

exports.create = async function (formData) {
  try {
    const nuevoAbiertoAnual = new AbiertoAnual({
      cuit: formData.cuit,
      nroLegajo: formData.nroLegajo,
      facturas: [null, null, null],
      status: ['Incompleto', 'Incompleto','Incompleto'],
      observaciones: ''
    });

    const createdAbiertoAnual = await nuevoAbiertoAnual.save();
    return createdAbiertoAnual;
  } catch (e) {
    throw new Error('No se pudo crear el elemento. Detalles del error: ' + e.message);
  }
};

exports.update = async function (id, update) {
  if (!update?.facturas || !Array.isArray(update.facturas)) {
    return AbiertoAnual.findOneAndUpdate({ _id: id }, update, {
      new: true,
    });
  }

  const existing = await AbiertoAnual.findById(id);
  if (!existing) return null;

  const mergedFacturas = update.facturas.map((factura, index) => {
    const prev = existing.facturas[index] ?? null;

    if (factura == null) {
      return prev;
    }

    if (!prev) {
      const nueva = {
        observaciones: factura.observaciones ?? '',
        rectificando: !!factura.rectificando,
      };
      if (factura.url) nueva.url = factura.url;
      return nueva;
    }

    const merged = {
      observaciones:
        factura.observaciones !== undefined
          ? factura.observaciones
          : prev.observaciones ?? '',
      rectificando:
        factura.rectificando !== undefined
          ? factura.rectificando
          : !!prev.rectificando,
    };

    if (factura.url) {
      merged.url = factura.url;
    } else if (prev.url) {
      merged.url = prev.url;
    }

    return merged;
  });

  return AbiertoAnual.findOneAndUpdate(
    { _id: id },
    { ...update, facturas: mergedFacturas },
    { new: true }
  );
};

exports.updateLazy = async function (id, update) {
  return AbiertoAnual.findOneAndUpdate({ _id: id }, update, {
    new: true,
  }).select('-facturas');
};


exports.delete = async function (id) {
  return AbiertoAnual.deleteOne({ _id: id });
};

exports.getById = async function (id) {
  return AbiertoAnual.findById(id);
};

// exports.getMany = async function (ids) {
//   return Obra.find().where("_id").in(ids);
// };

// exports.search = async function (expediente, objeto, adjudicado) {
//   let query = {};
//   // if (expediente) {
//   //   // // busca cualquier obra por el expediente
//   //   query.expediente = { $regex: expediente, $options: "i" };
//   // }
//   if (objeto) {
//     // busca cualquier obra por el objeto
//     query.objeto = { $regex: objeto, $options: "i" };
//   }
//   // if (adjudicado) {
//   //   // busca cualquier obra por el expediente
//   //   query.adjudicado = { $regex: adjudicado, $options: "i" };
//   // }
//   return Obra.find(query);
// };
