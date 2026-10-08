/**
 * Convierte tasaurbanadeudas al formato compacto (ver services/tasaUrbanaCompacto.js), in situ.
 * Requiere que el backend desplegado ya use expandirDeudas para leer.
 *
 * Uso:
 *   node scripts/compactarTasaUrbana.js                 # dry-run: verifica y estima, no escribe
 *   node scripts/compactarTasaUrbana.js --apply         # convierte
 *   node scripts/compactarTasaUrbana.js --apply --drop-partidas   # además elimina tasaurbanapartidas si no quedan boletas legacy
 * Opciones: --limit=N  --batch=N  --db=nombre (cambia la base de MONGO_URL)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { BSON } = require("mongodb");
const config = require("../config.js");
const TasaUrbanaCuenta = require("../models/tasaUrbanaCuenta.model");
const TasaUrbanaMensajePlantilla = require("../models/tasaUrbanaMensajePlantilla.model");
const { compactarDoc, aplicarEnMemoria, expandirDoc, expandirDeudas, vista } = require("../services/tasaUrbanaCompacto");

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value === undefined ? true : value];
  })
);
const APPLY = args.apply === true;
const DROP_PARTIDAS = args["drop-partidas"] === true;
const LIMIT = Number(args.limit) || 0;
const BATCH = Number(args.batch) || 1000;
const MUESTRA_POST = 500;

function uriConBase(uri, db) {
  if (!db) return uri;
  const url = new URL(uri);
  url.pathname = `/${db}`;
  return url.toString();
}

const mb = (bytes) => (bytes / 1e6).toFixed(1);

async function run() {
  const uri = config.MONGO_URL || process.env.MONGO_URL;
  if (!uri) throw new Error("Falta MONGO_URL");
  await mongoose.connect(uriConBase(uri, args.db), { autoIndex: false });
  const db = mongoose.connection.db;
  console.log(`Base: ${db.databaseName} | modo: ${APPLY ? "APPLY" : "dry-run"}`);

  const deudas = db.collection("tasaurbanadeudas");
  const partidasCol = db.collection("tasaurbanapartidas");
  if (APPLY) {
    await TasaUrbanaCuenta.createIndexes();
    await TasaUrbanaMensajePlantilla.createIndexes();
  }

  const codigos = new Map();
  for await (const row of partidasCol.find({}, { projection: { importBatchId: 1, partida: 1, codigosPago: 1 } })) {
    codigos.set(`${row.importBatchId}|${row.partida}`, row.codigosPago);
  }
  console.log(`Códigos por partida cargados: ${codigos.size}`);

  const cuentaIds = new Map();
  const plantillaIds = new Map();
  for await (const item of TasaUrbanaMensajePlantilla.collection.find({}, { projection: { hash: 1 } })) {
    plantillaIds.set(item.hash, item._id);
  }
  const cuentasNuevas = new Map();
  const plantillasNuevas = new Map();

  const stats = { leidas: 0, convertidas: 0, rechazadas: 0, sinMensajeCompacto: 0, bytesAntes: 0, bytesDespues: 0 };
  const rechazos = [];
  const muestra = [];

  async function resolverIds(lote) {
    const cuentasLote = new Map();
    const plantillasLote = new Map();
    for (const { compacto } of lote) {
      const keyCuenta = `${compacto.cuenta.partida}|${compacto.cuenta.hash}`;
      if (!cuentaIds.has(keyCuenta)) cuentasLote.set(keyCuenta, compacto.cuenta);
      if (compacto.plantilla && !plantillaIds.has(compacto.plantilla.hash)) {
        plantillasLote.set(compacto.plantilla.hash, compacto.plantilla);
      }
    }
    if (!APPLY) {
      for (const [key, cuenta] of cuentasLote) {
        cuentaIds.set(key, new mongoose.Types.ObjectId());
        cuentasNuevas.set(key, cuenta);
      }
      for (const [key, plantilla] of plantillasLote) {
        plantillaIds.set(key, new mongoose.Types.ObjectId());
        plantillasNuevas.set(key, plantilla);
      }
      return;
    }
    if (cuentasLote.size) {
      const lista = Array.from(cuentasLote.values());
      await TasaUrbanaCuenta.collection.bulkWrite(
        lista.map(({ partida, hash, ...datos }) => ({
          updateOne: {
            filter: { partida, hash },
            update: { $setOnInsert: Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined)) },
            upsert: true,
          },
        })),
        { ordered: false }
      );
      const guardadas = await TasaUrbanaCuenta.collection
        .find({ $or: lista.map(({ partida, hash }) => ({ partida, hash })) }, { projection: { partida: 1, hash: 1 } })
        .toArray();
      guardadas.forEach((item) => cuentaIds.set(`${item.partida}|${item.hash}`, item._id));
      lista.forEach((cuenta) => cuentasNuevas.set(`${cuenta.partida}|${cuenta.hash}`, cuenta));
    }
    if (plantillasLote.size) {
      const lista = Array.from(plantillasLote.values());
      await TasaUrbanaMensajePlantilla.collection.bulkWrite(
        lista.map(({ hash, texto }) => ({
          updateOne: { filter: { hash }, update: { $setOnInsert: { texto } }, upsert: true },
        })),
        { ordered: false }
      );
      const guardadas = await TasaUrbanaMensajePlantilla.collection
        .find({ hash: { $in: lista.map((item) => item.hash) } }, { projection: { hash: 1 } })
        .toArray();
      guardadas.forEach((item) => plantillaIds.set(item.hash, item._id));
      lista.forEach((plantilla) => plantillasNuevas.set(plantilla.hash, plantilla));
    }
  }

  async function procesarLote(docs) {
    const lote = [];
    for (const doc of docs) {
      const codigosPago = codigos.get(`${doc.importBatchId}|${doc.partida}`);
      const compacto = compactarDoc(doc, codigosPago);
      if (!compacto) continue;
      lote.push({ doc, codigosPago, compacto });
    }
    await resolverIds(lote);

    const ops = [];
    for (const { doc, codigosPago, compacto } of lote) {
      const keyCuenta = `${compacto.cuenta.partida}|${compacto.cuenta.hash}`;
      const cuentaId = cuentaIds.get(keyCuenta);
      const plantillaId = compacto.plantilla ? plantillaIds.get(compacto.plantilla.hash) : null;
      const enMemoria = aplicarEnMemoria(doc, compacto, cuentaId, plantillaId);
      const expandida = expandirDoc(enMemoria, compacto.cuenta, compacto.plantilla?.texto);
      const esperado = vista(doc, codigosPago);
      if (vista(expandida) !== esperado) {
        stats.rechazadas += 1;
        if (rechazos.length < 5) rechazos.push({ _id: String(doc._id), esperado, obtenido: vista(expandida) });
        continue;
      }
      if (doc.mensajeBoletaPersonalizado && !compacto.plantilla) stats.sinMensajeCompacto += 1;
      stats.convertidas += 1;
      stats.bytesAntes += BSON.calculateObjectSize(doc);
      stats.bytesDespues += BSON.calculateObjectSize(enMemoria);
      if (muestra.length < MUESTRA_POST && Math.random() < 0.02) muestra.push({ _id: doc._id, esperado });

      const set = { ...compacto.set, cuentaId };
      if (plantillaId) set.mp = plantillaId;
      ops.push({
        updateOne: {
          filter: { _id: doc._id, cuentaId: { $exists: false } },
          update: Object.keys(compacto.unset).length ? { $set: set, $unset: compacto.unset } : { $set: set },
        },
      });
    }
    if (APPLY && ops.length) await deudas.bulkWrite(ops, { ordered: false });
  }

  const cursor = deudas.find({ cuentaId: { $exists: false } }).batchSize(BATCH);
  if (LIMIT) cursor.limit(LIMIT);
  let buffer = [];
  for await (const doc of cursor) {
    stats.leidas += 1;
    buffer.push(doc);
    if (buffer.length >= BATCH) {
      await procesarLote(buffer);
      buffer = [];
      console.log(`  ${stats.leidas} leídas, ${stats.convertidas} ${APPLY ? "convertidas" : "convertibles"}`);
    }
  }
  if (buffer.length) await procesarLote(buffer);

  const bytesCuentas = Array.from(cuentasNuevas.values()).reduce(
    (acc, { partida, hash, ...datos }) => acc + BSON.calculateObjectSize({ _id: new mongoose.Types.ObjectId(), partida, hash, ...datos }),
    0
  );
  const bytesPlantillas = Array.from(plantillasNuevas.values()).reduce(
    (acc, item) => acc + BSON.calculateObjectSize({ _id: new mongoose.Types.ObjectId(), ...item }),
    0
  );

  console.log("\nResultado");
  console.log(`  Boletas leídas: ${stats.leidas}`);
  console.log(`  ${APPLY ? "Convertidas" : "Convertibles"}: ${stats.convertidas}`);
  console.log(`  Rechazadas por verificación (quedan legacy): ${stats.rechazadas}`);
  console.log(`  Con mensaje que queda como texto completo: ${stats.sinMensajeCompacto}`);
  console.log(`  Boletas: ${mb(stats.bytesAntes)} MB -> ${mb(stats.bytesDespues)} MB`);
  console.log(`  Cuentas nuevas: ${cuentasNuevas.size} (${mb(bytesCuentas)} MB)`);
  console.log(`  Plantillas de mensaje nuevas: ${plantillasNuevas.size} (${mb(bytesPlantillas)} MB)`);
  if (rechazos.length) console.log("  Primeros rechazos:", JSON.stringify(rechazos, null, 2));

  if (APPLY && muestra.length) {
    const ids = muestra.map((item) => item._id);
    const guardadas = await expandirDeudas(await deudas.find({ _id: { $in: ids } }).toArray());
    const porId = new Map(guardadas.map((doc) => [String(doc._id), doc]));
    const fallas = muestra.filter((item) => {
      const doc = porId.get(String(item._id));
      return !doc || vista(doc) !== item.esperado;
    });
    console.log(`  Verificación post-escritura: ${muestra.length - fallas.length}/${muestra.length} OK`);
    if (fallas.length) console.log("  Fallas:", fallas.slice(0, 5).map((item) => String(item._id)));
  }

  if (APPLY && DROP_PARTIDAS) {
    const legacy = await deudas.countDocuments({ cuentaId: { $exists: false } });
    if (legacy) {
      console.log(`  No se elimina tasaurbanapartidas: quedan ${legacy} boletas legacy.`);
    } else {
      await partidasCol.drop().catch((error) => console.log(`  No se pudo eliminar tasaurbanapartidas: ${error.message}`));
      console.log("  tasaurbanapartidas eliminada.");
    }
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
