require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const AWS = require("aws-sdk");
const ExcelJS = require("exceljs");
const { MONGO_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = require("../config");
const AbiertoAnual = require("../models/abiertoAnual.model");

const OUTPUT_BASE_DIR = path.resolve(__dirname, "descargas");
const LOG_FILE_PATH = path.join(OUTPUT_BASE_DIR, "log.txt");
const EXCEL_FILE_PATH = path.join(OUTPUT_BASE_DIR, "2026. FINAL Comercio Abierto Anual.xlsx");
const S3_BUCKET = process.env.AWS_BUCKET || "haciendagesell";

const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

const logLines = [];

function nowIso() {
  return new Date().toISOString();
}

function log(message) {
  const line = `[${nowIso()}] ${message}`;
  logLines.push(line);
  console.log(line);
}

function sanitizeSegment(value) {
  if (value === null || value === undefined || value === "") return "sin_dato";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

function extractExtensionFromContentType(contentType) {
  if (!contentType) return "bin";
  const ext = String(contentType).split("/")[1];
  return ext ? ext.replace(/[^a-zA-Z0-9]/g, "") : "bin";
}

function parsePeriodoFromKey(key) {
  if (!key) return null;

  const baseName = path.basename(key);
  const nameWithoutExt = baseName.replace(/\.[^.]+$/, "");
  const segments = nameWithoutExt.split("_");
  const rawPeriodo = segments[segments.length - 1];
  const periodAsNumber = Number(rawPeriodo);

  if (!Number.isInteger(periodAsNumber) || periodAsNumber < 0) {
    return null;
  }

  return {
    raw: periodAsNumber,
    normalized: periodAsNumber + 1, // Mapeo pedido: 0,1,2 -> 1,2,3
  };
}

async function listFacturasByCuitLegajo(cuit, nroLegajo) {
  const candidatePrefixes = [
    `${sanitizeSegment(cuit)}_${sanitizeSegment(nroLegajo)}_`,
    `abierto-anual/${sanitizeSegment(cuit)}_${sanitizeSegment(nroLegajo)}_`,
  ];

  const uniqueByKey = new Map();

  for (const prefix of candidatePrefixes) {
    let continuationToken;

    do {
      const response = await s3
        .listObjectsV2({
          Bucket: S3_BUCKET,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
        .promise();

      (response.Contents || []).forEach((item) => {
        if (item && item.Key) uniqueByKey.set(item.Key, item);
      });

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  return Array.from(uniqueByKey.values());
}

async function ensureOutputFolder() {
  await fs.promises.mkdir(OUTPUT_BASE_DIR, { recursive: true });
}

async function buildExcel(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Comercio Abierto");

  sheet.columns = [
    { header: "CUIT", key: "cuit", width: 18 },
    { header: "Legajo", key: "nroLegajo", width: 14 },
    { header: "Anio", key: "anio", width: 10 },
    { header: "DFE", key: "dfe", width: 26 },
    { header: "Estado 1", key: "status1", width: 20 },
    { header: "Estado 2", key: "status2", width: 20 },
    { header: "Estado 3", key: "status3", width: 20 },
    { header: "Fecha Carga 1", key: "fecha1", width: 22 },
    { header: "Fecha Carga 2", key: "fecha2", width: 22 },
    { header: "Fecha Carga 3", key: "fecha3", width: 22 },
    { header: "URL Factura 1", key: "url1", width: 60 },
    { header: "URL Factura 2", key: "url2", width: 60 },
    { header: "URL Factura 3", key: "url3", width: 60 },
  ];

  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
}

async function downloadFactura({
  cuit,
  nroLegajo,
  status,
  periodo,
  key,
  targetFolder,
}) {
  if (!key) {
    log(`⚠️ Key inválida para ${cuit}_${nroLegajo}, período ${periodo}`);
    return false;
  }

  const stateSegment = sanitizeSegment(status || "sin_estado");
  const periodSegment = sanitizeSegment(periodo);

  try {
    const s3Object = await s3
      .getObject({
        Bucket: S3_BUCKET,
        Key: key,
      })
      .promise();

    const extFromKey = path.extname(key).replace(".", "");
    const extension = extFromKey || extractExtensionFromContentType(s3Object.ContentType);
    const fileName = `${sanitizeSegment(cuit)}_${sanitizeSegment(nroLegajo)}_${stateSegment}_${periodSegment}.${extension}`;
    const filePath = path.join(targetFolder, fileName);

    await fs.promises.writeFile(filePath, s3Object.Body);
    log(`✅ Descargado: ${filePath}`);
    return true;
  } catch (error) {
    log(`❌ Error al descargar ${cuit}_${nroLegajo}, período ${periodo}: ${error.message}`);
    return false;
  }
}

async function main() {
  let totalProcesados = 0;
  let totalDescargados = 0;
  let totalFallidos = 0;

  try {
    if (!MONGO_URL) {
      throw new Error("MONGO_URL no está definido.");
    }

    await ensureOutputFolder();
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log("✅ Conectado a MongoDB Atlas");

    const abiertos = await AbiertoAnual.find({}).lean();
    log(`📦 Se encontraron ${abiertos.length} registros en 'abiertoanual'.`);

    const excelRows = [];

    for (const abierto of abiertos) {
      const cuit = abierto.cuit || "sin_cuit";
      const nroLegajo = abierto.nroLegajo || "sin_legajo";
      const comboFolderName = `${sanitizeSegment(cuit)}_${sanitizeSegment(nroLegajo)}`;
      const comboFolderPath = path.join(OUTPUT_BASE_DIR, comboFolderName);

      log(`📁 Intentando crear carpeta para: ${comboFolderName}`);
      await fs.promises.mkdir(comboFolderPath, { recursive: true });
      log(`📂 Carpeta creada: ${comboFolderPath}`);

      const statuses = Array.isArray(abierto.status) ? abierto.status : [];
      const s3Facturas = await listFacturasByCuitLegajo(cuit, nroLegajo);

      log(`🧭 Facturas encontradas en S3 para ${comboFolderName}: ${s3Facturas.length}`);

      // Si hay más de un archivo para el mismo período, nos quedamos con el más reciente.
      const facturaPorPeriodo = new Map();
      for (const item of s3Facturas) {
        const periodInfo = parsePeriodoFromKey(item.Key);
        if (!periodInfo) continue;

        const previous = facturaPorPeriodo.get(periodInfo.raw);
        if (!previous) {
          facturaPorPeriodo.set(periodInfo.raw, item);
          continue;
        }

        if (item.LastModified && previous.LastModified && item.LastModified > previous.LastModified) {
          facturaPorPeriodo.set(periodInfo.raw, item);
        }
      }

      const periodosOrdenados = Array.from(facturaPorPeriodo.keys()).sort((a, b) => a - b);

      for (const periodoRaw of periodosOrdenados) {
        const facturaS3 = facturaPorPeriodo.get(periodoRaw);
        const periodInfo = parsePeriodoFromKey(facturaS3.Key);
        const periodo = periodInfo ? periodInfo.normalized : periodoRaw + 1;
        const status = statuses[periodoRaw] || "sin_estado";
        totalProcesados++;

        const downloaded = await downloadFactura({
          cuit,
          nroLegajo,
          status,
          periodo,
          key: facturaS3.Key,
          targetFolder: comboFolderPath,
        });

        if (downloaded) totalDescargados++;
        else totalFallidos++;
      }

      excelRows.push({
        cuit,
        nroLegajo,
        anio: abierto.anio || "",
        dfe: abierto.dfe || "",
        status1: statuses[0] || "",
        status2: statuses[1] || "",
        status3: statuses[2] || "",
        fecha1: abierto.fechasCarga?.[0] || "",
        fecha2: abierto.fechasCarga?.[1] || "",
        fecha3: abierto.fechasCarga?.[2] || "",
        url1: abierto.facturas?.[0]?.url || "",
        url2: abierto.facturas?.[1]?.url || "",
        url3: abierto.facturas?.[2]?.url || "",
      });
    }

    await buildExcel(excelRows);
    log(`🧾 Excel generado: ${EXCEL_FILE_PATH}`);
    log(`📊 Resumen: procesados=${totalProcesados}, descargados=${totalDescargados}, fallidos=${totalFallidos}`);
    log("🏁 Todas las descargas finalizadas.");
  } catch (error) {
    log(`💥 Error general: ${error.message}`);
    process.exitCode = 1;
  } finally {
    try {
      await fs.promises.writeFile(LOG_FILE_PATH, `${logLines.join("\n")}\n`, "utf8");
      console.log(`Log exportado en: ${LOG_FILE_PATH}`);
    } catch (error) {
      console.error(`No se pudo escribir log.txt: ${error.message}`);
    }

    try {
      await mongoose.disconnect();
    } catch (_) {}
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
