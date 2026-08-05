const crypto = require("crypto");
const mongoose = require("mongoose");
const config = require("../config");
const TasaBoleta = require("../models/tasaBoleta.model");
const TasaImportacion = require("../models/tasaImportacion.model");
const TasaObjeto = require("../models/tasaObjeto.model");

const QA_PREFIX = "QA_DEMO_";
const QA_USER = "qa-demo@gesell.gob.ar";
const YEAR_PERIOD_COUNTS = new Map([
  [2019, 1],
  [2020, 12],
  [2021, 4],
  [2022, 9],
  [2023, 6],
  [2024, 11],
  [2025, 8],
]);
const SHARED_DOMAINS = [
  { dominio: "QATEST02", periodos: 2 },
  { dominio: "QATEST05", periodos: 5 },
  { dominio: "QATEST12", periodos: 12 },
  { dominio: "QATEST24", periodos: 24 },
  { dominio: "QATEST51", periodos: Number.POSITIVE_INFINITY },
];

function seededRandom(seed) {
  let value = seed;
  return function random() {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function selectedMonths(count, random) {
  if (count === 1) return [1];
  if (count === 12) return Array.from({ length: 12 }, (_, index) => index + 1);
  const months = new Set([1, 12]);
  while (months.size < count) months.add(1 + Math.floor(random() * 12));
  return [...months].sort((a, b) => a - b);
}

function versionCount(year, month, random) {
  if (year === 2019 && month === 1) return 1;
  if (year === 2020 && month === 12) return 5;
  return 1 + Math.floor(random() * 5);
}

function dateFor(year, month, day) {
  return new Date(Date.UTC(year, month - 1, Math.min(day, 28), 12, 0, 0));
}

async function clean() {
  const imports = await TasaImportacion.find({ nombreArchivo: { $regex: `^${QA_PREFIX}` } }).select("_id");
  const ids = imports.map((item) => item._id);
  const bills = ids.length ? await TasaBoleta.deleteMany({ importacionId: { $in: ids } }) : { deletedCount: 0 };
  const objects = ids.length ? await TasaObjeto.deleteMany({ importacionId: { $in: ids } }) : { deletedCount: 0 };
  const attempts = await TasaImportacion.deleteMany({ _id: { $in: ids } });
  return {
    importaciones: attempts.deletedCount || 0,
    objetos: objects.deletedCount || 0,
    boletas: bills.deletedCount || 0,
  };
}

async function seed() {
  const random = seededRandom(20260613);
  const imports = [];
  const bills = [];
  const objects = [];
  let periodCount = 0;

  for (const [year, count] of YEAR_PERIOD_COUNTS) {
    for (const month of selectedMonths(count, random)) {
      periodCount += 1;
      const periodo = `${String(month).padStart(2, "0")}/${year}`;
      const versions = versionCount(year, month, random);
      const sharedDomains = SHARED_DOMAINS.filter((item) => periodCount <= item.periodos);

      for (let version = 1; version <= versions; version += 1) {
        const enabled = version === versions;
        const importacionId = new mongoose.Types.ObjectId();
        const publishedAt = dateFor(year, month, 10 + version);
        const fileName = `${QA_PREFIX}${year}_${String(month).padStart(2, "0")}_V${version}.xlsx`;
        const importeCentavos = 100 + Math.floor(random() * 9999900);
        const domain = `QA${String(year).slice(-2)}${String(month).padStart(2, "0")}`;

        imports.push({
          _id: importacionId,
          tipoTasa: "AUTOMOTORES",
          nombreArchivo: fileName,
          tamanoBytes: 1024 + Math.floor(random() * 4000000),
          hashArchivo: crypto.createHash("sha256").update(fileName).digest("hex"),
          formato: version % 2 ? "simplificado" : "completo",
          estado: enabled ? "publicada" : "reemplazada",
          periodos: [periodo],
          periodosActivos: enabled ? [periodo] : [],
          cantidadEntradas: 1 + (enabled ? sharedDomains.length : 0),
          cantidadObjetos: 1 + (enabled ? sharedDomains.length : 0),
          cantidadErrores: 0,
          cantidadAdvertencias: version === 2 ? 1 : 0,
          observaciones: [],
          observacionesOmitidas: 0,
          subidoPor: { username: QA_USER },
          publicadoPor: { username: QA_USER },
          publicadoAt: publishedAt,
          archivoOriginal: { almacenado: false },
          createdAt: publishedAt,
          updatedAt: publishedAt,
        });

        bills.push({
          tipoTasa: "AUTOMOTORES",
          importacionId,
          objetoClave: domain,
          anio: year,
          cuota: month,
          periodo,
          contribuyente: {
            nombre: "CONTRIBUYENTE QA DEMO",
            domicilio: "DOMICILIO FICTICIO 123",
            localidad: "VILLA GESELL",
            codigoPostal: "7165",
          },
          objeto: {
            dominio: domain,
            categoria: "QA",
            marca: "MARCA DEMO",
            modelo: `MODELO V${version}`,
            anioModelo: year,
          },
          recibo: `QA${year}${month}${version}`,
          mensajeDeuda: version === 5 ? "DATO DE PRUEBA - SIN VALIDEZ" : "",
          importeCentavos,
          vencimientos: [
            { orden: 1, fecha: dateFor(year, month, 10), importeCentavos, codigoBarra: `${year}${month}${version}100000000001` },
            { orden: 2, fecha: dateFor(year, month, 25), importeCentavos: importeCentavos + 5000, codigoBarra: `${year}${month}${version}200000000002` },
          ],
          codigosPago: { pagoMisCuentas: `QA${year}${month}`, redLink: `QA${month}${year}` },
          activa: enabled,
          createdAt: publishedAt,
          updatedAt: publishedAt,
        });

        if (enabled) {
          for (const shared of sharedDomains) {
            const sharedImporteCentavos = 100 + Math.floor(random() * 9999900);
            bills.push({
              tipoTasa: "AUTOMOTORES",
              importacionId,
              objetoClave: shared.dominio,
              anio: year,
              cuota: month,
              periodo,
              contribuyente: {
                nombre: `CONTRIBUYENTE ${shared.dominio}`,
                domicilio: "DOMICILIO FICTICIO 456",
                localidad: "VILLA GESELL",
                codigoPostal: "7165",
              },
              objeto: {
                dominio: shared.dominio,
                categoria: "QA COMPARTIDO",
                marca: "MARCA DEMO",
                modelo: `PRUEBA ${shared.dominio}`,
                anioModelo: 2020,
              },
              recibo: `${shared.dominio}${year}${month}`,
              mensajeDeuda: "DATO DE PRUEBA - SIN VALIDEZ",
              importeCentavos: sharedImporteCentavos,
              vencimientos: [
                {
                  orden: 1,
                  fecha: dateFor(year, month, 10),
                  importeCentavos: sharedImporteCentavos,
                  codigoBarra: `${year}${month}${shared.dominio}1001`,
                },
                {
                  orden: 2,
                  fecha: dateFor(year, month, 25),
                  importeCentavos: sharedImporteCentavos + 5000,
                  codigoBarra: `${year}${month}${shared.dominio}2002`,
                },
              ],
              codigosPago: { pagoMisCuentas: `${shared.dominio}${year}`, redLink: `${shared.dominio}${month}` },
              activa: true,
              createdAt: publishedAt,
              updatedAt: publishedAt,
            });
          }
        }
      }
    }
  }

  for (const bill of bills) {
    const objectId = new mongoose.Types.ObjectId();
    bill.objetoId = objectId;
    objects.push({
      _id: objectId,
      tipoTasa: bill.tipoTasa,
      importacionId: bill.importacionId,
      objetoClave: bill.objetoClave,
      contribuyente: bill.contribuyente,
      objeto: bill.objeto,
      mensajeDeuda: bill.mensajeDeuda,
      codigosPago: bill.codigosPago,
    });
    delete bill.contribuyente;
    delete bill.objeto;
    delete bill.mensajeDeuda;
    delete bill.codigosPago;
  }

  await TasaImportacion.insertMany(imports);
  await TasaObjeto.insertMany(objects);
  await TasaBoleta.insertMany(bills);
  return {
    anios: YEAR_PERIOD_COUNTS.size,
    periodos: periodCount,
    versiones: imports.length,
    objetos: objects.length,
    boletas: bills.length,
    habilitadas: bills.filter((item) => item.activa).length,
    dominiosCompartidos: SHARED_DOMAINS.map((item) => ({
      dominio: item.dominio,
      periodos: Math.min(item.periodos, periodCount),
    })),
  };
}

async function main() {
  await mongoose.connect(config.MONGO_URL);
  const cleaned = await clean();
  if (process.argv.includes("--clean")) {
    console.log("Datos QA eliminados:", cleaned);
    return;
  }
  const result = await seed();
  console.log("Datos QA anteriores eliminados:", cleaned);
  console.log("Datos QA creados:", result);
}

main()
  .catch((error) => {
    console.error("No se pudieron generar los datos QA:", error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
