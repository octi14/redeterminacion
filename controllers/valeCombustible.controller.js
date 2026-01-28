let ValeCombustibleService = require("../services/valeCombustible.service");
let OrdenCompraService = require("../services/ordenCompra.service");

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
    const { orden, monto, tipoCombustible, area, dominio, proveedor, cantidad } = req.body.payload;

    if (!cantidad || cantidad < 1) {
      return res.status(400).json({ message: "La cantidad debe ser al menos 1." });
    }

    // Buscar la orden de compra
    let ordenCompra = await OrdenCompraService.getById(orden);

    if (ordenCompra == null) { // Evalúa null y undefined
      return res.status(404).json({ message: "Orden de compra no encontrada" });
    }

    // Validar que el total (cantidad * monto) no exceda el saldo disponible para este tipo
    const saldoTipo = ordenCompra.saldoRestante.find(s => s.tipoCombustible === tipoCombustible);
    if (!saldoTipo) {
      return res.status(400).json({ message: `No se encontró saldo para el tipo de combustible ${tipoCombustible} en esta orden.` });
    }
    const totalRequerido = cantidad * monto;
    if (totalRequerido > saldoTipo.saldo) {
      return res.status(400).json({ message: `Saldo insuficiente para el tipo de combustible ${tipoCombustible}. Total requerido: ${totalRequerido}, saldo disponible: ${saldoTipo.saldo}.` });
    }

    // Reservar saldo de forma atómica (delegado al servicio para evitar condición de carrera)
    ordenCompra = await OrdenCompraService.reservarSaldo(orden, tipoCombustible, totalRequerido);
    if (!ordenCompra) {
      return res.status(400).json({
        message: `Saldo insuficiente para el tipo de combustible ${tipoCombustible} (puede deberse a una operación concurrente).`,
      });
    }

    // Fecha límite para el cambio de numeración: 4 de noviembre de 2025, 00:00 (hora Argentina)
    const fechaLimite = new Date('2025-11-04T00:00:00-03:00'); // UTC-3 para hora Argentina
    const ordenCreatedAt = new Date(ordenCompra.createdAt);

    // Determinar qué sistema de numeración usar según la fecha de creación de la orden
    let cant_vales;
    if (ordenCreatedAt < fechaLimite) {
      // Numeración antigua: cuenta todos los vales de la orden sin importar el tipo
      cant_vales = Array.isArray(ordenCompra.vales) ? ordenCompra.vales.length : 0;
    } else {
      // Numeración nueva: cuenta solo vales del mismo tipo de combustible
      const valesDelMismoTipo = await ValeCombustibleService.findByOrdenAndTipo(orden, tipoCombustible);
      cant_vales = valesDelMismoTipo.length;
    }

    // Crear múltiples vales según la cantidad especificada
    const valesCreados = [];
    for (let i = 0; i < cantidad; i++) {
      const valeData = {
        nro_vale: cant_vales + i + 1,
        orden,
        monto,
        tipoCombustible,
        area,
        dominio,
        proveedor,
        fechaEmision: new Date(), // Fecha actual
        consumido: false, // Siempre false al crearlo
      };

      const createdVale = await ValeCombustibleService.create(valeData);
      ordenCompra.vales.push(createdVale._id); // Agregar el ID del vale a la orden
      valesCreados.push(createdVale);
      // El saldo ya se descontó de forma atómica antes del bucle
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
      ordenCompra.markModified('vales');
      ordenCompra.markModified('observaciones');
      ordenCompra.markModified('saldoRestante');
      await ordenCompra.save();
    } catch (err) {
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

exports.update = async function (req, res) {
  try {
    // TODO: validate req.params and req.body
    const { id } = req.params;
    const {
      orden,
      monto,
      tipoCombustible,
      area,
      dominio,
      fechaEmision,
      consumido,
    } = req.body.vale;

    const updated = await ValeCombustibleService.update(id, {
      orden: orden,
      monto: monto,
      tipoCombustible: tipoCombustible,
      area: area,
      dominio: dominio,
      fechaEmision: fechaEmision,
      consumido: consumido,
    });

    return res.status(200).json({
      message: "Vale modificado.",
      data: updated,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};


// Anular un vale de combustible y devolver saldo a la orden de compra
exports.anular = async function (req, res) {
  try {
    const { id } = req.params; // ID del vale
    const { ordenId } = req.body; // ID de la orden (opcional)

    // Buscar el vale de combustible
    const vale = await ValeCombustibleService.getById(id);
    if (!vale) {
      return res.status(404).json({ message: "Vale de combustible no encontrado" });
    }

    if (vale.consumido) {
      return res.status(400).json({ message: "El vale ya fue consumido, no se puede anular" });
    }

    // Marcar el vale como no consumido (disponible)
    vale.anulado = true;
    await vale.save();

    // Buscar la orden de compra asociada
    let ordenCompra;
    ordenCompra = await OrdenCompraService.findByValeId(id);

    if (ordenCompra) {
      // Buscar el saldo restante correspondiente al tipo de combustible del vale
      const saldoIndex = ordenCompra.saldoRestante.findIndex(s => s.tipoCombustible === vale.tipoCombustible);

      if (saldoIndex !== -1) {
        // Si existe, sumamos el monto al saldo correspondiente
        ordenCompra.saldoRestante[saldoIndex].saldo += vale.monto;
        ordenCompra.markModified('saldoRestante');
        await ordenCompra.save();
      } else {
        // Si no existe, lanzar un error
        return res.status(400).json({
          message: `No se encontró saldo disponible para el tipo de combustible "${vale.tipoCombustible}" en esta orden de compra.`,
        });
      }
    }

    return res.status(200).json({
      message: "Vale de combustible anulado correctamente. Saldo devuelto a la orden de compra.",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message || "Ocurrió un error al anular el vale de combustible.",
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
