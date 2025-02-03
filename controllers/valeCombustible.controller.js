let ValeCombustibleService = require("../services/valeCombustible.service");
let OrdenCompraService = require("../services/ordenCompra.service");
let OrdenCompra = require("../models/ordenCompra.model");

// Obtener todos los vales de combustible por ID de orden de compra
exports.getAllByOrden = async function (req, res) {
  try {
    const { id } = req.body;  // Obtener el ID de los parámetros de la URL
    const vales = await ValeCombustibleService.findByOrdenId(id);  // Usar un servicio para buscar los vales

    return res.status(200).json({
      data: vales,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message || "Ocurrió un error al obtener los vales.",
    });
  }
};

exports.getAll = async function (req, res){
  try {
    let vales = await ValeCombustibleService.findAll();
    return res.status(200).json({
      data: vales,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
exports.add = async function (req, res) {
  try {
    // Extraer los datos del cuerpo del request
    const { orden, monto, tipoCombustible, area, cantidad } = req.body.payload;

    if (!cantidad || cantidad < 1) {
      return res.status(400).json({ message: "La cantidad debe ser al menos 1." });
    }

    // Buscar la orden de compra
    const ordenCompra = await OrdenCompra.findById(orden);

    if (ordenCompra == null) { // Evalúa null y undefined
      console.log("❌ ERROR: Se consideró que la orden no existe.");
      return res.status(404).json({ message: "Orden de compra no encontrada" });
    }

    // Crear múltiples vales según la cantidad especificada
    const valesCreados = [];
    for (let i = 0; i < cantidad; i++) {
      const valeData = {
        orden,
        monto,
        tipoCombustible,
        area,
        fechaEmision: new Date(), // Fecha actual
        consumido: false, // Siempre false al crearlo
      };

      const createdVale = await ValeCombustibleService.create(valeData);
      ordenCompra.vales.push(createdVale._id); // Agregar el ID del vale a la orden
      valesCreados.push(createdVale);

      // Descontar el saldo correspondiente según el tipo de combustible
      if (tipoCombustible === 'Super') {
        if (ordenCompra.saldoRestante.saldoSuper >= monto) {
          ordenCompra.saldoRestante.saldoSuper -= monto;
        } else {
          return res.status(400).json({ message: "Saldo insuficiente para el tipo de combustible Super." });
        }
      } else if (tipoCombustible === 'V-Power') {
        if (ordenCompra.saldoRestante.saldoVPower >= monto) {
          ordenCompra.saldoRestante.saldoVPower -= monto;
        } else {
          return res.status(400).json({ message: "Saldo insuficiente para el tipo de combustible V-Power." });
        }
      } else {
        return res.status(400).json({ message: "Tipo de combustible no válido." });
      }
    }

    // Generar la observación con la fecha y hora actual
    const fechaHora = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const observacion = `Se generaron ${cantidad} vales de ${tipoCombustible} por $${monto} para la orden ${ordenCompra.nroOrden} el día ${fechaHora} **`;

    // Agregar la observación a la orden
    if (!ordenCompra.observaciones) {
      ordenCompra.observaciones = [];
    }
    ordenCompra.observaciones.push(observacion);

    // Guardar la orden con los nuevos vales y la observación
    try {
      console.log("💾 Guardando ordenCompra con los nuevos vales y la observación...");
      ordenCompra.markModified('vales');
      ordenCompra.markModified('observaciones');
      await ordenCompra.save();
      console.log("✅ Orden guardada correctamente.");
    } catch (err) {
      console.error("🔥 Error al guardar la orden:", err);
      return res.status(500).json({ message: "Error al guardar la orden de compra." });
    }

    // Responder con los vales creados
    return res.status(201).json({
      message: `${cantidad} Vale(s) de combustible creados correctamente`,
      data: valesCreados,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message || "Ocurrió un error al crear los vales de combustible.",
    });
  }
};



// Eliminar un vale de combustible
exports.delete = async function (req, res) {
  try {
    const { id } = req.params; // Obtener el ID del vale desde los parámetros de la URL
    const { ordenId } = req.body; // Recibir el ID de la orden de compra si se envía

    // Eliminar el vale de la base de datos
    const deletedVale = await ValeCombustibleService.delete(id);
    if (!deletedVale) {
      return res.status(404).json({ message: "Vale de combustible no encontrado" });
    }

    // Buscar y actualizar la orden de compra, removiendo el ID del vale eliminado
    let ordenCompra;
    if (ordenId) {
      // Si tenemos el ID de la orden, buscamos directamente
      ordenCompra = await OrdenCompraService.getById(ordenId);
    } else {
      // Si no tenemos el ID, buscamos la orden que tenga este vale
      ordenCompra = await OrdenCompraService.findByValeId(id);
    }

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
