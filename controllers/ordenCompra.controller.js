let OrdenCompraService = require("../services/ordenCompra.service");
let ValeCombustibleService = require("../services/valeCombustible.service");
const RbacService = require("../services/rbac.service");

async function requirePermission(req, permission) {
  const context = await RbacService.getCurrentUserContext(req);
  if (!RbacService.can(context.access.permissions, permission)) {
    const error = new Error("No tiene permisos para realizar esta accion.");
    error.status = 403;
    error.permission = permission;
    throw error;
  }
  return context;
}

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
    await requirePermission(req, "compras.ordenes.update");

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

exports.update = async function (req, res) {
  try {
    const { id } = req.params;
    await requirePermission(req, "compras.ordenes.update");

    const orden = await OrdenCompraService.getById(id);
    if (!orden) {
      return res.status(404).json({ message: "Orden de compra no encontrada." });
    }

    const { nroOrden, area, proveedor, montos } = req.body.orden;
    const updated = await OrdenCompraService.update(id, {
      nroOrden,
      area,
      proveedor,
      monto: montos,
    });

    return res.status(200).json({
      message: "Orden de compra modificada correctamente",
      data: updated,
    });
  } catch (e) {
    return res.status(e.status || 400).json({
      message: e.message || "Ocurrio un error al modificar la orden de compra",
      permission: e.permission,
    });
  }
};

exports.delete = async function (req, res) {
  try {
    const { id } = req.params;
    await requirePermission(req, "compras.ordenes.delete");

    const orden = await OrdenCompraService.getById(id);
    if (!orden) {
      return res.status(404).json({ message: "Orden de compra no encontrada." });
    }

    const tieneVales = Array.isArray(orden.vales) && orden.vales.length > 0;
    const context = await RbacService.getCurrentUserContext(req);
    const puedeGestionarVales = RbacService.can(context.access.permissions, "compras.vales.update");
    if (tieneVales && !puedeGestionarVales) {
      return res.status(403).json({
        message: "Solo se pueden eliminar ordenes sin vales asociados.",
        permission: "compras.vales.update",
      });
    }

    for (const vale of orden.vales) {
      await ValeCombustibleService.delete(vale._id);
    }

    await OrdenCompraService.delete(id);

    return res.status(200).json({
      message: "Orden de compra eliminada.",
    });
  } catch (e) {
    return res.status(e.status || 400).json({
      message: e.message,
      permission: e.permission,
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
