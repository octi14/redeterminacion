let OrdenCompraService = require("../services/ordenCompra.service");
let ValeCombustibleService = require("../services/valeCombustible.service");

//Obtener todas las órdenes de compra
exports.getAll = async function (req, res) {
  try {
    // const { sort, skip, limit } = req.pagination;
    let ordenes = await OrdenCompraService.findAll();
    return res.status(200).json({
      data: ordenes,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

// Crear orden de compra
exports.add = async function (req, res) {
  try {
    // Extraer datos del cuerpo del request
    const { nroOrden, area, proveedor, montos } = req.body.orden; // Se espera que 'montos' sea un array de objetos con { tipoCombustible, monto }

    // Construir los datos para la nueva orden
    const ordenData = {
      nroOrden,
      area,
      proveedor,
      monto: montos,
      observaciones: [],
    };

    // Crear la orden en la base de datos
    const createdFile = await OrdenCompraService.create(ordenData);

    // Responder con éxito
    return res.status(201).json({
      message: "Orden de compra creada correctamente",
      data: createdFile,
    });
  } catch (e) {
    // Manejo de errores
    return res.status(400).json({
      message: e.message || "Ocurrió un error al crear la orden de compra",
    });
  }
};

exports.delete = async function (req, res) {
  try {
    const { id } = req.params;

    // Obtener la orden con sus vales
    const orden = await OrdenCompraService.getById(id);

    // Borrar cada vale asociado
    for (const vale of orden.vales) {
      await ValeCombustibleService.delete(vale._id);
    }

    // Borrar la orden de compra
    await OrdenCompraService.delete(id);

    return res.status(200).json({
      message: "Orden de compra eliminada.",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};


exports.getById = async function (req, res) {
  try {
    // TODO: validate req.params
    const { id } = req.params;
    let orden = await OrdenCompraService.getById(id);
    return res.status(200).json({
      data: orden,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

// exports.search = async function (req, res) {
//   try {
//     const { expediente, objeto, adjudicado } = req.body;
//     let obras = await ObraService.search(expediente, objeto, adjudicado);
//     return res.status(200).json({
//       data: obras,
//     });
//   } catch (e) {
//     return res.status(400).json({
//       message: e.message,
//     });
//   }
// };
