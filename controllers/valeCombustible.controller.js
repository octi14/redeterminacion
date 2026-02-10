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
    const { orden, monto, tipoCombustible, area, dominio, proveedor, cantidad } = req.body.payload;

    if (!cantidad || cantidad < 1) {
      return res.status(400).json({ message: "La cantidad debe ser al menos 1." });
    }

    const ordenCompra = await OrdenCompraService.getById(orden);
    if (ordenCompra == null) {
      return res.status(404).json({ message: "Orden de compra no encontrada" });
    }

    // Monto autorizado para este tipo (orden.monto, no saldoRestante)
    const montoTipo = ordenCompra.monto && ordenCompra.monto.find(m => m.tipoCombustible === tipoCombustible);
    if (!montoTipo) {
      return res.status(400).json({ message: `No se encontró el tipo de combustible ${tipoCombustible} en esta orden.` });
    }

    // Vales ya emitidos de este tipo (no anulados) para calcular saldo
    const valesDelTipo = await ValeCombustibleService.findByOrdenAndTipo(orden, tipoCombustible);
    const valesNoAnulados = valesDelTipo.filter(v => !v.anulado);
    const totalEmitido = valesNoAnulados.reduce((sum, v) => sum + (Number(v.monto) || 0), 0);
    const saldo = (Number(montoTipo.monto) || 0) - totalEmitido;
    const totalRequerido = cantidad * monto;

    if (saldo < totalRequerido) {
      return res.status(400).json({
        message: `Saldo insuficiente para el tipo de combustible ${tipoCombustible}. Total requerido: ${totalRequerido}, saldo disponible: ${saldo}.`,
      });
    }

    // Fecha límite para numeración: 4 de noviembre de 2025. Antes se usaba ordenCompra.vales.length;
    // desde esa fecha usamos valesDelTipo.length para numeración consistente (ver comentario en valeCombustible.service).
    const fechaLimite = new Date('2025-11-04T00:00:00-03:00');
    const ordenCreatedAt = new Date(ordenCompra.createdAt);

    // Numeración: total de vales del tipo (incl. anulados), sin cambiar comportamiento previo al plan
    let cant_vales;
    if (ordenCreatedAt < fechaLimite) {
      cant_vales = Array.isArray(ordenCompra.vales) ? ordenCompra.vales.length : 0;
    } else {
      cant_vales = valesDelTipo.length;
    }

    const valesCreados = [];
    const valeIds = [];
    for (let i = 0; i < cantidad; i++) {
      const valeData = {
        nro_vale: cant_vales + i + 1,
        orden,
        monto,
        tipoCombustible,
        area,
        dominio,
        proveedor,
        fechaEmision: new Date(),
        consumido: false,
      };
      const createdVale = await ValeCombustibleService.create(valeData);
      valesCreados.push(createdVale);
      valeIds.push(createdVale._id);
    }

    const fechaHora = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const observacion = `Se generaron ${cantidad} vales de ${tipoCombustible} por $${monto} para la orden ${ordenCompra.nroOrden} el día ${fechaHora} **`;

    await OrdenCompraService.agregarValesYObservacion(orden, valeIds, observacion);

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


// Anular un vale de combustible (el saldo se recalcula: los anulados no cuentan)
exports.anular = async function (req, res) {
  try {
    const { id } = req.params;
    const vale = await ValeCombustibleService.getById(id);
    if (!vale) {
      return res.status(404).json({ message: "Vale de combustible no encontrado" });
    }

    if (vale.consumido) {
      return res.status(400).json({ message: "El vale ya fue consumido, no se puede anular" });
    }

    vale.anulado = true;
    await vale.save();

    return res.status(200).json({
      message: "Vale de combustible anulado correctamente.",
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
