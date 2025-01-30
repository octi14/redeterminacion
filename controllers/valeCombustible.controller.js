let ValeCombustibleService = require("../services/valeCombustible.service");

// Obtener todos los vales de combustible por ID de orden de compra
exports.getAllByOrden = async function (req, res) {
  try {
    const { id } = req.params; // Obtener el ID de la orden desde los parámetros de la URL
    const vales = await ValeCombustibleService.findByOrdenId(id); // Usar un servicio para buscar los vales

    return res.status(200).json({
      data: vales,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message || "Ocurrió un error al obtener los vales.",
    });
  }
};

// Crear un nuevo vale de combustible
exports.add = async function (req, res) {
  try {
    // Extraer los datos del cuerpo del request
    const { orden, monto, tipoCombustible, area, fechaEmision, consumido } = req.body;

    // Preparar los datos para el nuevo vale
    const valeData = {
      orden, // ID de la orden de compra a la que pertenece este vale
      monto,
      tipoCombustible,
      area,
      fechaEmision,
      consumido,
    };

    // Crear el nuevo vale de combustible en la base de datos
    const createdVale = await ValeCombustibleService.create(valeData);

    // Actualizar la orden de compra, agregando el ID del nuevo vale al array de vales
    const ordenCompra = await OrdenCompraService.findById(orden);
    if (!ordenCompra) {
      return res.status(404).json({ message: "Orden de compra no encontrada" });
    }

    ordenCompra.vales.push(createdVale._id); // Agregar el nuevo vale a la lista de vales de la orden
    await ordenCompra.save();

    // Responder con éxito
    return res.status(201).json({
      message: "Vale de combustible creado correctamente",
      data: createdVale,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message || "Ocurrió un error al crear el vale de combustible.",
    });
  }
};

// Eliminar un vale de combustible
exports.delete = async function (req, res) {
  try {
    const { id } = req.params; // Obtener el ID del vale desde los parámetros de la URL

    // Eliminar el vale de la base de datos
    const deletedVale = await ValeCombustibleService.delete(id);
    if (!deletedVale) {
      return res.status(404).json({ message: "Vale de combustible no encontrado" });
    }

    // Buscar y actualizar la orden de compra, removiendo el ID del vale eliminado
    const ordenCompra = await OrdenCompraService.findByValeId(id);
    if (ordenCompra) {
      ordenCompra.vales = ordenCompra.vales.filter(valeId => valeId.toString() !== id);
      await ordenCompra.save();
    }

    return res.status(200).json({
      message: "Vale de combustible eliminado correctamente",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message || "Ocurrió un error al eliminar el vale de combustible.",
    });
  }
};

// Obtener un vale de combustible por su ID
exports.getById = async function (req, res) {
  try {
    const { id } = req.params; // Obtener el ID del vale desde los parámetros de la URL
    const vale = await ValeCombustibleService.getById(id);
    if (!vale) {
      return res.status(404).json({ message: "Vale de combustible no encontrado" });
    }
    return res.status(200).json({
      data: vale,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message || "Ocurrió un error al obtener el vale de combustible.",
    });
  }
};
