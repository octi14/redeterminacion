let OrdenCompraService = require("../services/ordenCompra.service");

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

//Crear orden de compra
exports.add = async function (req, res) {
  try {
    // Extraer datos del cuerpo del request
    const { nroOrden, area, montoSuper, montoVPower } = req.body.orden;

    // Preparar los datos para la nueva orden
    const ordenData = {
      nroOrden,
      area,
      monto: {
        montoSuper,
        montoVPower,
      },
      saldoRestante: {
        saldoSuper: montoSuper, // Mismo valor inicial que montoSuper
        saldoVPower: montoVPower, // Mismo valor inicial que montoVPower
      },
      observaciones: [], // Se inicializa como un array vacío
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

//Actualizar orden de compra
exports.update = async function (req, res) {
  try {
    // Extraer el ID de la orden a actualizar desde los parámetros de la URL
    const { id } = req.params;

    // Extraer los datos del cuerpo del request
    const { valeId, saldoSuperRestado, saldoVPowerRestado, monto } = req.body;

    // Buscar la orden de compra existente
    const ordenCompra = await OrdenCompraService.findById(id);
    if (!ordenCompra) {
      return res.status(404).json({ message: "Orden de compra no encontrada" });
    }

    // Actualizar la lista de vales agregando el nuevo ID
    if (valeId) {
      ordenCompra.vales.push(valeId);
    }

    // Restar el saldo especificado de saldoSuper y saldoVPower
    if (saldoSuperRestado) {
      ordenCompra.saldoRestante.saldoSuper -= saldoSuperRestado;
    }
    if (saldoVPowerRestado) {
      ordenCompra.saldoRestante.saldoVPower -= saldoVPowerRestado;
    }

    // Actualizar el objeto monto si se proporciona
    if (monto) {
      ordenCompra.monto.montoSuper = monto.montoSuper ?? ordenCompra.monto.montoSuper;
      ordenCompra.monto.montoVPower = monto.montoVPower ?? ordenCompra.monto.montoVPower;
    }

    // Guardar los cambios en la base de datos
    const updatedOrden = await ordenCompra.save();

    // Responder con éxito
    return res.status(200).json({
      message: "Orden de compra actualizada correctamente",
      data: updatedOrden,
    });
  } catch (e) {
    // Manejo de errores
    return res.status(400).json({
      message: e.message || "Ocurrió un error al actualizar la orden de compra",
    });
  }
};

exports.delete = async function (req, res) {
  try {
    // TODO: validate req.params
    const { id } = req.params;

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
