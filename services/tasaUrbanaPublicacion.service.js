const TasaUrbanaCuenta = require("../models/tasaUrbanaCuenta.model");
const TasaUrbanaDeuda = require("../models/tasaUrbanaDeuda.model");
const TasaUrbanaImportacion = require("../models/tasaUrbanaImportacion.model");

const INTERVALO_MS = 60 * 1000;
let publicando = false;
let intervalo = null;

function filtroPeriodos(periodos = []) {
  if (!periodos.length) return {};
  return {
    $or: periodos.map((item) => ({ anio: Number(item.anio), cuota: Number(item.cuota) })),
  };
}

async function unificarCuentasDuplicadas() {
  const dupes = await TasaUrbanaCuenta.aggregate([
    { $group: { _id: "$partida", ids: { $push: "$_id" }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]);
  for (const grupo of dupes) {
    const ids = grupo.ids;
    const usado = await TasaUrbanaDeuda.findOne({ cuentaId: { $in: ids } })
      .sort({ anio: -1, cuota: -1 })
      .select("cuentaId")
      .lean();
    const keepId = usado?.cuentaId || ids[0];
    const drop = ids.filter((id) => String(id) !== String(keepId));
    if (!drop.length) continue;
    await TasaUrbanaDeuda.updateMany({ cuentaId: { $in: drop } }, { $set: { cuentaId: keepId } });
    await TasaUrbanaCuenta.deleteMany({ _id: { $in: drop } });
  }
  return dupes.length;
}

async function asegurarEsquemaCuentas() {
  const unificadas = await unificarCuentasDuplicadas();
  await TasaUrbanaCuenta.syncIndexes();
  if (unificadas) console.log(`Tasa urbana: ${unificadas} partidas con cuentas duplicadas unificadas.`);
}

async function gcCuentasHuerfanas() {
  const usadas = (await TasaUrbanaDeuda.distinct("cuentaId")).filter(Boolean);
  if (!usadas.length) return 0;
  const result = await TasaUrbanaCuenta.deleteMany({ _id: { $nin: usadas } });
  return result.deletedCount || 0;
}

async function borrarLoteAnterior(importBatchId) {
  const anteriores = await TasaUrbanaDeuda.distinct("importBatchId", {
    importBatchId: { $ne: importBatchId },
    pagado: { $ne: true },
  });
  if (!anteriores.length) return 0;
  const result = await TasaUrbanaDeuda.deleteMany({
    importBatchId: { $in: anteriores },
    pagado: { $ne: true },
  });
  return result.deletedCount || 0;
}

function periodosPendientes(importacion, now = new Date()) {
  const overrides = importacion.periodosPublicacion || [];
  const pendientes = overrides.filter((item) => !item.publicadoAt && item.publicarAt && item.publicarAt <= now);
  if (pendientes.length) return pendientes.map((item) => ({ anio: item.anio, cuota: item.cuota }));
  if (importacion.publicarAt && importacion.publicarAt <= now) return [];
  return null;
}

async function publicarImportacion({
  importacionId,
  importBatchId,
  borrarAnterior = false,
  periodos = [],
} = {}) {
  const importacion = importacionId
    ? await TasaUrbanaImportacion.findById(importacionId)
    : await TasaUrbanaImportacion.findOne({ importBatchId });
  if (!importacion?.importBatchId) {
    const err = new Error("La importación no está lista para publicar.");
    err.status = 404;
    throw err;
  }
  const batchId = importacion.importBatchId;
  let pares = periodos;
  if (!pares.length) {
    const agrupados = await TasaUrbanaDeuda.aggregate([
      { $match: { importBatchId: batchId } },
      { $group: { _id: { anio: "$anio", cuota: "$cuota" } } },
    ]);
    pares = agrupados.map((item) => item._id);
  }
  const filtro = filtroPeriodos(pares);
  if (pares.length) {
    await TasaUrbanaDeuda.updateMany(
      { activa: true, importBatchId: { $ne: batchId }, ...filtro },
      { $set: { activa: false } }
    );
  }

  let cantidadBorradas = 0;
  const debeBorrar = borrarAnterior || importacion.borrarAnteriorAlPublicar;
  if (debeBorrar && !importacion.anteriorBorrada) {
    cantidadBorradas = await borrarLoteAnterior(batchId);
    await gcCuentasHuerfanas();
    importacion.anteriorBorrada = true;
    importacion.cantidadBorradas = (importacion.cantidadBorradas || 0) + cantidadBorradas;
  }

  await TasaUrbanaDeuda.updateMany({ importBatchId: batchId, ...filtro }, { $set: { activa: true } });

  const now = new Date();
  if (periodos.length) {
    importacion.periodosPublicacion = (importacion.periodosPublicacion || []).map((item) => {
      const coincide = periodos.some((p) => Number(p.anio) === item.anio && Number(p.cuota) === item.cuota);
      if (coincide && !item.publicadoAt) item.publicadoAt = now;
      return item;
    });
    const quedan = (importacion.periodosPublicacion || []).some((item) => !item.publicadoAt && item.publicarAt > now);
    const importacionAunFutura = importacion.publicarAt && importacion.publicarAt > now;
    importacion.estado = quedan || importacionAunFutura ? "programada" : "completada";
  } else {
    (importacion.periodosPublicacion || []).forEach((item) => {
      if (!item.publicadoAt) item.publicadoAt = now;
    });
    importacion.estado = "completada";
  }
  importacion.publicadoAt = now;
  await importacion.save();

  return {
    importacionId: String(importacion._id),
    importBatchId: String(batchId),
    estado: importacion.estado,
    cantidadBorradas,
    periodos,
  };
}

async function aplicarPublicacionesPendientes() {
  if (publicando) return { aplicadas: 0 };
  publicando = true;
  try {
    const now = new Date();
    const pendientes = await TasaUrbanaImportacion.find({
      estado: "programada",
      importBatchId: { $exists: true },
      $or: [{ publicarAt: { $lte: now } }, { "periodosPublicacion.publicarAt": { $lte: now } }],
    }).lean();
    let aplicadas = 0;
    for (const item of pendientes) {
      const periodos = periodosPendientes(item, now);
      if (periodos == null) continue;
      await publicarImportacion({
        importacionId: item._id,
        borrarAnterior: item.borrarAnteriorAlPublicar !== false,
        periodos,
      });
      aplicadas += 1;
    }
    return { aplicadas };
  } finally {
    publicando = false;
  }
}

function iniciarPublicadorUrbana() {
  if (intervalo) return;
  aplicarPublicacionesPendientes().catch((error) => {
    console.error("Tasa urbana publicador inicial:", error.message);
  });
  intervalo = setInterval(() => {
    aplicarPublicacionesPendientes().catch((error) => {
      console.error("Tasa urbana publicador:", error.message);
    });
  }, INTERVALO_MS);
  if (typeof intervalo.unref === "function") intervalo.unref();
}

async function programarPublicacion({
  importacionId,
  importBatchId,
  publicarAt,
  periodos = [],
}) {
  const importacion = importacionId
    ? await TasaUrbanaImportacion.findById(importacionId)
    : await TasaUrbanaImportacion.findOne({ importBatchId });
  if (!importacion?.importBatchId) {
    const err = new Error("No encontramos esa importación.");
    err.status = 404;
    throw err;
  }
  const fecha = publicarAt ? new Date(publicarAt) : null;
  if (publicarAt && Number.isNaN(fecha.getTime())) {
    const err = new Error("La fecha de publicación no es válida.");
    err.status = 400;
    throw err;
  }
  const now = new Date();
  if (periodos.length) {
    const mapa = new Map(
      (importacion.periodosPublicacion || []).map((item) => [`${item.anio}|${item.cuota}`, item.toObject ? item.toObject() : item])
    );
    for (const item of periodos) {
      const anio = Number(item.anio);
      const cuota = Number(item.cuota);
      const at = item.publicarAt ? new Date(item.publicarAt) : fecha;
      if (!anio || !cuota || !at || Number.isNaN(at.getTime())) continue;
      mapa.set(`${anio}|${cuota}`, { anio, cuota, publicarAt: at, publicadoAt: undefined });
    }
    importacion.periodosPublicacion = Array.from(mapa.values());
  }
  if (fecha && !periodos.length) importacion.publicarAt = fecha;
  importacion.borrarAnteriorAlPublicar = true;
  const hayFuturo =
    (importacion.publicarAt && importacion.publicarAt > now) ||
    (importacion.periodosPublicacion || []).some((item) => !item.publicadoAt && item.publicarAt > now);
  importacion.estado = hayFuturo ? "programada" : importacion.estado;
  await importacion.save();
  if (!hayFuturo) {
    return publicarImportacion({
      importacionId: importacion._id,
      borrarAnterior: true,
      periodos: periodos.map((item) => ({ anio: item.anio, cuota: item.cuota })),
    });
  }
  return {
    importacionId: String(importacion._id),
    estado: importacion.estado,
    publicarAt: importacion.publicarAt,
    periodosPublicacion: importacion.periodosPublicacion,
  };
}

module.exports = {
  asegurarEsquemaCuentas,
  gcCuentasHuerfanas,
  publicarImportacion,
  aplicarPublicacionesPendientes,
  iniciarPublicadorUrbana,
  programarPublicacion,
};
