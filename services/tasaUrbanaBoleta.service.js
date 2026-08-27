const TasaUrbanaImportacion = require("../models/tasaUrbanaImportacion.model");
const TasaUrbanaPartida = require("../models/tasaUrbanaPartida.model");
const { resolverTextosBoleta } = require("./tasaUrbanaTextos");

function periodoKey(anio, cuota) {
  return `${anio}|${cuota}`;
}

function mapCalendarios(importaciones = []) {
  const calendarios = new Map();
  for (const importacion of importaciones) {
    if (!importacion?.importBatchId) continue;
    calendarios.set(String(importacion.importBatchId), importacion.calendarioPeriodos || []);
  }
  return calendarios;
}

function fechaCalendario(calendarioPeriodos, anio, cuota, orden) {
  const periodo = (calendarioPeriodos || []).find(
    (item) => item.anio === anio && item.cuota === cuota
  );
  if (!periodo) return null;
  const vencimiento = (periodo.vencimientos || []).find((item) => item.orden === orden);
  return vencimiento?.fecha || null;
}

exports.hidratarVencimientos = function hidratarVencimientos(doc, calendarioPeriodos = []) {
  return (doc.vencimientos || []).map((item) => {
    if (item.fecha) return item;
    const fecha = fechaCalendario(calendarioPeriodos, doc.anio, doc.cuota, item.orden);
    return fecha ? { ...item, fecha } : item;
  });
};

exports.cargarCalendariosPorBatch = async function cargarCalendariosPorBatch(importBatchIds = []) {
  const ids = [...new Set((importBatchIds || []).map(String).filter(Boolean))];
  if (!ids.length) return new Map();
  const importaciones = await TasaUrbanaImportacion.find({
    importBatchId: { $in: ids },
  })
    .select("importBatchId calendarioPeriodos")
    .lean();
  return mapCalendarios(importaciones);
};

exports.cargarCodigosPorPartida = async function cargarCodigosPorPartida(importBatchId, partidas = []) {
  const claves = [...new Set((partidas || []).map(String).filter(Boolean))];
  if (!importBatchId || !claves.length) return new Map();
  const rows = await TasaUrbanaPartida.find({
    importBatchId,
    partida: { $in: claves },
  })
    .select("partida codigosPago")
    .lean();
  return new Map(rows.map((row) => [row.partida, row.codigosPago || {}]));
};

exports.hidratarBoletaUrbana = function hidratarBoletaUrbana(
  doc,
  { calendarioPeriodos = [], codigosPago = {} } = {}
) {
  const textos = resolverTextosBoleta({
    deudaAnterior: Boolean(doc.deudaAnterior),
    mensajeBoletaPersonalizado: doc.mensajeBoletaPersonalizado,
  });
  return {
    ...doc,
    ...textos,
    codigosPago,
    vencimientos: exports.hidratarVencimientos(doc, calendarioPeriodos),
  };
};

exports.periodoKey = periodoKey;
