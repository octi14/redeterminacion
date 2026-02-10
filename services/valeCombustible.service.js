let ValeCombustible = require("../models/valeCombustible.model");
let OrdenCompra = require("../models/ordenCompra.model");  // Importar el modelo de OrdenCompra

/*
 * Numeración de vales (nro_vale): la lógica se aplica en valeCombustible.controller (add).
 * Fecha límite: 4 de noviembre de 2025. Antes de esa fecha las órdenes usaban un contador
 * guardado en la orden (ordenCompra.vales.length). A partir del 4/11/2025 la numeración
 * se calcula con la cantidad real de vales del tipo en BD (valesDelTipo.length), para que
 * el número de vale sea consistente aunque se anulen vales o se creen desde distintos flujos.
 */

exports.create = async function (valeData) {
  try {
    const nuevoVale = new ValeCombustible(valeData);
    const createdVale = await nuevoVale.save();
    return createdVale;
  } catch (e) {
    console.error("Error al crear el vale de combustible:", e);
    throw new Error("Error al crear el vale de combustible.");
  }
};


exports.findAll = async function () {
  try {
    return await ValeCombustible.find();
  } catch (e) {
    console.error(e);
    throw new Error("Error al obtener los vales de combustible.");
  }
};

exports.findByOrdenId = async function (id) {
  try {
    return await ValeCombustible.find({ orden: id });
  } catch (e) {
    console.error(e);
    throw new Error("Error al obtener los vales de la orden.");
  }
};

exports.findByOrdenAndTipo = async function (ordenId, tipoCombustible) {
  try {
    return await ValeCombustible.find({ orden: ordenId, tipoCombustible: tipoCombustible });
  } catch (e) {
    console.error(e);
    throw new Error("Error al obtener los vales de la orden por tipo de combustible.");
  }
};


exports.update = async function (id, update) {
  try {
    return await ValeCombustible.findOneAndUpdate({ _id: id }, update, {
      new: true,  // Devuelve el documento actualizado
    });
  } catch (e) {
    console.error(e);
    throw new Error("Error al actualizar el vale de combustible.");
  }
};

exports.delete = async function (id) {
  try {
    return await ValeCombustible.deleteOne({ _id: id });
  } catch (e) {
    console.error(e);
    throw new Error("Error al eliminar el vale de combustible.");
  }
};

exports.getById = async function (id) {
  try {
    return await ValeCombustible.findById(id);
  } catch (e) {
    console.error(e);
    throw new Error("Error al obtener el vale de combustible.");
  }
};

// Si es necesario realizar algún tipo de búsqueda por criterios específicos
// exports.search = async function (nroVale, estado) {
//   let query = {};
//   if (nroVale) {
//     query.nroVale = { $regex: nroVale, $options: "i" };
//   }
//   if (estado) {
//     query.estado = estado;
//   }
//   return ValeCombustible.find(query);
// };
