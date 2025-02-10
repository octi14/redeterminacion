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
      monto: montos, // Se usa directamente el array de montos recibido
      saldoRestante: montos.map(({ tipoCombustible, monto }) => ({
        tipoCombustible,
        saldo: monto, // Inicialmente el saldo restante es igual al monto
      })),
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

// Actualizar orden de compra
exports.update = async function (req, res) {
  try {
    // Extraer el ID de la orden a actualizar desde los parámetros de la URL
    const { id } = req.params;

    // Extraer los datos del cuerpo del request
    const { valeId, saldoRestado, montos } = req.body;
    // saldoRestado debería ser un array de objetos con { tipoCombustible, saldoRestado }
    // montos debería ser un array de objetos con { tipoCombustible, monto }

    // Buscar la orden de compra existente
    const ordenCompra = await OrdenCompraService.findById(id);
    if (!ordenCompra) {
      return res.status(404).json({ message: "Orden de compra no encontrada" });
    }

    // Actualizar la lista de vales agregando el nuevo ID
    if (valeId) {
      ordenCompra.vales.push(valeId);
    }

    // Restar el saldo correspondiente a cada tipo de combustible
    if (saldoRestado && Array.isArray(saldoRestado)) {
      saldoRestado.forEach(({ tipoCombustible, saldoRestado }) => {
        const saldo = ordenCompra.saldoRestante.find(s => s.tipoCombustible === tipoCombustible);
        if (saldo) {
          saldo.saldo -= saldoRestado;
        }
      });
    }

    // Actualizar los montos si se proporcionan
    if (montos && Array.isArray(montos)) {
      montos.forEach(({ tipoCombustible, monto }) => {
        const montoObj = ordenCompra.monto.find(m => m.tipoCombustible === tipoCombustible);
        if (montoObj) {
          montoObj.monto = monto;
        } else {
          // Si no existe, se agrega un nuevo tipo de combustible con su monto
          ordenCompra.monto.push({ tipoCombustible, monto });
        }
      });
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
