const PeriodoCementerio = require('../models/periodoCementerio.model');
const CertificadoDefuncion = require('../models/certificadoDefuncion.model');
const StorageService = require('./cementerioStorage.service');

const monthBounds = (date = new Date()) => {
  const anio = date.getFullYear();
  const mes = date.getMonth() + 1;
  return {
    anio,
    mes,
    fechaInicio: new Date(anio, mes - 1, 1),
    fechaFin: new Date(anio, mes, 0, 23, 59, 59, 999),
  };
};

exports.closeExpiredPeriods = async function () {
  const now = new Date();
  await PeriodoCementerio.updateMany(
    { estado: 'ABIERTO', fechaFin: { $lt: now } },
    { $set: { estado: 'PENDIENTE_CONFIRMACION' } },
  );
};

exports.getOrCreateOpenPeriod = async function (funerariaId, date = new Date()) {
  await exports.closeExpiredPeriods();
  const bounds = monthBounds(date);
  return PeriodoCementerio.findOneAndUpdate(
    { funerariaId, anio: bounds.anio, mes: bounds.mes },
    {
      $setOnInsert: {
        funerariaId,
        ...bounds,
        estado: 'ABIERTO',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

exports.getPeriodWithDetails = async function (id) {
  const periodo = await PeriodoCementerio.findById(id).populate('funerariaId').lean();
  if (!periodo) return null;
  const fallecidos = await CertificadoDefuncion.find({ periodoId: periodo._id }).sort({ createdAt: -1, _id: -1 }).lean();
  return exports.formatPeriod(periodo, fallecidos);
};

exports.getPeriods = async function (filter = {}) {
  await exports.closeExpiredPeriods();
  const periodos = await PeriodoCementerio.find(filter).populate('funerariaId').sort({ anio: -1, mes: -1 }).lean();
  const ids = periodos.map(item => item._id);
  const fallecidos = await CertificadoDefuncion.find({ periodoId: { $in: ids } }).sort({ createdAt: -1, _id: -1 }).lean();
  const grouped = fallecidos.reduce((acc, item) => {
    const key = String(item.periodoId);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  return periodos.map(periodo => exports.formatPeriod(periodo, grouped[String(periodo._id)] || []));
};

exports.calculateSummary = function (fallecidos) {
  const detalle = fallecidos.reduce((acc, item) => {
    const key = item.tipoSepultura || 'sin_tipo';
    if (!acc[key]) acc[key] = { pagos: 0, exentos: 0, total: 0 };
    if (item.condicionPago === 'EXENTO') {
      acc[key].exentos += 1;
    } else {
      acc[key].pagos += 1;
      acc[key].total += Number(item.precioAplicado || 0);
    }
    return acc;
  }, {});
  const total = Object.values(detalle).reduce((sum, item) => sum + item.total, 0);
  return { detalle, total };
};

exports.formatPeriod = function (periodo, fallecidos) {
  const resumen = exports.calculateSummary(fallecidos);
  const formattedFallecidos = fallecidos.map(item => {
    const documentos = {};
    const documentosArray = item.documentos && item.documentos.documentos || [];
    documentosArray.forEach(documento => {
      documentos[documento.nombreDocumento] = { url: StorageService.getSignedUrl(documento.url) };
    });
    return { ...item, id: item._id, documentos };
  });
  const comprobantePagoMensual = periodo.comprobantePagoMensual && periodo.comprobantePagoMensual.url
    ? { ...periodo.comprobantePagoMensual, url: StorageService.getSignedUrl(periodo.comprobantePagoMensual.url) }
    : periodo.comprobantePagoMensual;
  return {
    ...periodo,
    comprobantePagoMensual,
    id: periodo._id,
    funeraria: periodo.funerariaId,
    funerariaId: periodo.funerariaId && periodo.funerariaId._id || periodo.funerariaId,
    fallecidos: formattedFallecidos,
    cantidadFallecidos: formattedFallecidos.length,
    total: periodo.totalConfirmado !== undefined ? periodo.totalConfirmado : resumen.total,
    resumen: periodo.resumenConfirmado || resumen.detalle,
  };
};

exports.monthBounds = monthBounds;
