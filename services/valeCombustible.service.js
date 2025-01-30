let ValeCombustible = require("../models/valeCombustible.model");
let OrdenCompra = require("../models/ordenCompra.model");  // Importar el modelo de OrdenCompra

exports.create = async function (formData) {
  try {
    // Buscar la orden de compra a la que pertenece el vale
    const ordenCompra = await OrdenCompra.findById(formData.ordenCompraId);

    if (!ordenCompra) {
      throw new Error("Orden de compra no encontrada.");
    }

    // El número de vale será el tamaño del array de vales + 1
    const nroVale = ordenCompra.vales.length + 1;

    // Crear el nuevo vale de combustible con los datos recibidos y el nroVale calculado
    const nuevoValeCombustible = new ValeCombustible({
      nroVale: nroVale,
      ordenCompra: formData.ordenCompraId,
      fecha: formData.fecha,
      monto: formData.monto,
      estado: formData.estado || 'Pendiente',  // Si no se pasa estado, se asigna 'Pendiente'
      observaciones: formData.observaciones || '',
    });

    // Guardar el nuevo vale de combustible
    const createdValeCombustible = await nuevoValeCombustible.save();

    // Luego, agregar el ID del nuevo vale al array de vales de la orden de compra
    ordenCompra.vales.push(createdValeCombustible._id);
    await ordenCompra.save();  // Guardamos la orden de compra con el nuevo vale

    return createdValeCombustible;
  } catch (e) {
    throw new Error('No se pudo crear el vale de combustible. Detalles del error: ' + e.message);
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
