const fs = require("fs");
const ExcelJS = require("exceljs");
const AWS = require("aws-sdk");
const Config = require("../models/configs.model");
const TasaUrbanaDeuda = require("../models/tasaUrbanaDeuda.model");
const TasaUrbanaImportacion = require("../models/tasaUrbanaImportacion.model");

const S3_BUCKET = process.env.AWS_BUCKET || "haciendagesell";
const CONFIG_GUARDAR_ORIGINAL = "guardarArchivoOriginalTasas:URBANA";

const MAX_OBSERVACIONES = 200;
const FIRMA_URBANA = ["Titular", "Partida", "Catastro", "$1erVto", "F-1erVto", "CodBarra-1erVto"];
const REQUERIDAS_URBANA = [
  "Titular", "Partida", "Catastro", "Mes", "Año", "Recibo", "$1erVto", "$2doVto",
  "F-1erVto", "F-2doVto", "CodBarra-1erVto", "CodBarra-2doVto", "Banelco", "RedLink",
];

/** Misma lista que tasaImportacion (boleta urbana / PDF futuro). */
const CONCEPTOS_URBANA = [
  ["Alumb", "Tasa de Alumbrado"],
  ["Limp", "Tasa de Limpieza"],
  ["CVP", "Tasa C.V.P."],
  ["Bomber", "Tasa de Bomberos"],
  ["Cement", "Tasa de Cementerio"],
  ["Turist", "Tasa Turística"],
  ["Segur", "Tasa de Seguridad"],
  ["Salud", "Tasa de Salud"],
  ["Resid", "Tasa de Residuos"],
  ["SegPya", "Seguridad en Playas"],
  ["AguaCor", "Tasa de Agua Corriente"],
  ["Retro", "Retroactivo"],
  ["O.Gas", "Obra de Gas"],
  ["MqVial", "Mantenimiento vial"],
  ["Obras24", "Obras"],
  ["Hospital", "Obras Hospital"],
  ["Bonif10$", "Bonificación B.C."],
  ["Bonif20%", "Bonificación 1er vencimiento"],
  ["Credito", "Créditos"],
];

function texto(value) {
  return String(value == null ? "" : value).trim().replace(/\s+/g, " ");
}

function importeCentavos(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);
  let normalized = String(value).replace(/[^\d,.-]/g, "");
  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");
  if (comma > -1 && dot > -1) {
    normalized = dot > comma
      ? normalized.replace(/,/g, "")
      : normalized.replace(/\./g, "").replace(",", ".");
  } else if (comma > -1) {
    normalized = normalized.replace(",", ".");
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

function fecha(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && value > 20000 && value < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  }
  const match = texto(value).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const result = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return result.getFullYear() === Number(match[3]) &&
    result.getMonth() === Number(match[2]) - 1 &&
    result.getDate() === Number(match[1])
    ? result
    : null;
}

function valorCelda(cell) {
  if (!cell) return "";
  if (cell.value && typeof cell.value === "object" && "result" in cell.value) return cell.value.result;
  if (cell.value && typeof cell.value === "object" && Array.isArray(cell.value.richText)) {
    return cell.value.richText.map((item) => item.text).join("");
  }
  return cell.value == null ? "" : cell.value;
}

function encabezado(value) {
  return texto(value).replace(/[–—−]/g, "-");
}

function valorCodigo(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(Math.round(value));
  }
  return texto(value);
}

function campo(row, ...nombres) {
  for (const nombre of nombres) {
    const value = valorCodigo(row[nombre]);
    if (value) return value;
  }
  const keys = Object.keys(row || {});
  for (const nombre of nombres) {
    const needle = encabezado(nombre).toLowerCase();
    const key = keys.find((item) => encabezado(item).toLowerCase() === needle);
    const value = valorCodigo(key ? row[key] : "");
    if (value) return value;
  }
  return "";
}

function filaComoObjetoDesdeValores(values, headers) {
  const result = {};
  headers.forEach((header, index) => {
    const normalized = encabezado(header);
    if (!normalized) return;
    let key = normalized;
    let suffix = 1;
    while (Object.prototype.hasOwnProperty.call(result, key)) {
      key = `${normalized}_${suffix}`;
      suffix += 1;
    }
    result[key] = valorCelda({ value: values[index + 1] });
  });
  return result;
}

function encabezadosDeFila(row) {
  const values = row.values || [];
  return values.slice(1).map((value) => encabezado(valorCelda({ value })));
}

function detectarCabeceraEnEncabezados(headers) {
  if (!FIRMA_URBANA.every((header) => headers.includes(header))) return null;
  return {
    headers,
    faltantes: REQUERIDAS_URBANA.filter((header) => !headers.includes(header)),
  };
}

function agregarObservacion(resultado, tipo, fila, columna, mensaje) {
  if (tipo === "error") resultado.cantidadErrores += 1;
  else resultado.cantidadAdvertencias += 1;
  if (resultado.observaciones.length < MAX_OBSERVACIONES) {
    resultado.observaciones.push({ tipo, fila, columna, mensaje });
  } else {
    resultado.observacionesOmitidas += 1;
  }
}

function construirDoc(row, rowNumber, resultado) {
  const partida = texto(row.Partida).replace(/\s/g, "").toUpperCase();
  const month = Number(row.Mes);
  const year = Number(row.Año);
  const firstAmount = importeCentavos(row["$1erVto"]);
  const secondAmount = importeCentavos(row["$2doVto"]);
  const firstDate = fecha(row["F-1erVto"]);
  const secondDate = fecha(row["F-2doVto"]);
  const firstBarcode = texto(row["CodBarra-1erVto"]);
  const secondBarcode = texto(row["CodBarra-2doVto"]);
  const erroresAntes = resultado.cantidadErrores;

  if (!texto(row.Titular)) agregarObservacion(resultado, "error", rowNumber, "Titular", "El titular es obligatorio.");
  if (!partida) agregarObservacion(resultado, "error", rowNumber, "Partida", "La partida es obligatoria.");
  else if (!/^[A-Z0-9]{1,16}$/.test(partida)) agregarObservacion(resultado, "error", rowNumber, "Partida", "Debe contener entre 1 y 16 caracteres alfanuméricos.");
  if (!texto(row.Domicilio)) agregarObservacion(resultado, "advertencia", rowNumber, "Domicilio", "El domicilio está vacío.");
  if (!texto(row.Localidad)) agregarObservacion(resultado, "advertencia", rowNumber, "Localidad", "La localidad está vacía.");
  if (!texto(row.Catastro)) agregarObservacion(resultado, "advertencia", rowNumber, "Catastro", "La nomenclatura catastral está vacía.");
  if (!texto(row.Zon)) agregarObservacion(resultado, "advertencia", rowNumber, "Zon", "La zona está vacía.");
  if (!Number.isInteger(month) || month < 1 || month > 12) agregarObservacion(resultado, "error", rowNumber, "Mes", "Debe ser un mes entre 01 y 12.");
  if (!Number.isInteger(year) || year < 1900 || year > 2200) agregarObservacion(resultado, "error", rowNumber, "Año", "Debe ser un año válido de cuatro dígitos.");
  if (!texto(row.Recibo)) agregarObservacion(resultado, "error", rowNumber, "Recibo", "El número de recibo es obligatorio.");
  if (firstAmount == null || firstAmount < 0) agregarObservacion(resultado, "error", rowNumber, "$1erVto", "Debe ser un importe válido mayor o igual a cero.");
  if (secondAmount == null || secondAmount < 0) agregarObservacion(resultado, "error", rowNumber, "$2doVto", "Debe ser un importe válido mayor o igual a cero.");
  if (firstAmount != null && secondAmount != null && secondAmount < firstAmount) {
    agregarObservacion(resultado, "advertencia", rowNumber, "$2doVto", "Es menor que el primer vencimiento.");
  }
  if (!firstDate) agregarObservacion(resultado, "error", rowNumber, "F-1erVto", "La fecha del primer vencimiento no es válida.");
  if (!secondDate) agregarObservacion(resultado, "error", rowNumber, "F-2doVto", "La fecha del segundo vencimiento no es válida.");
  if (firstDate && secondDate && secondDate < firstDate) {
    agregarObservacion(resultado, "error", rowNumber, "F-2doVto", "Es anterior al primer vencimiento.");
  }
  if (!firstBarcode || !/^[A-Z0-9]+$/i.test(firstBarcode)) {
    agregarObservacion(resultado, "error", rowNumber, "CodBarra-1erVto", "El código de barras no es válido.");
  }
  if (!secondBarcode || !/^[A-Z0-9]+$/i.test(secondBarcode)) {
    agregarObservacion(resultado, "error", rowNumber, "CodBarra-2doVto", "El código de barras no es válido.");
  }
  if (!texto(row.Banelco)) agregarObservacion(resultado, "error", rowNumber, "Banelco", "El código de Pago Mis Cuentas es obligatorio.");
  if (!texto(row.RedLink)) agregarObservacion(resultado, "error", rowNumber, "RedLink", "El código de Red Link es obligatorio.");

  if (resultado.cantidadErrores > erroresAntes) return null;

  const metros = Number(String(row.Const ?? "").replace(",", "."));
  const conceptosCompactos = CONCEPTOS_URBANA.map(([codigo], index) => [
    index,
    importeCentavos(row[codigo]),
  ]).filter((item) => item[1] != null && item[1] !== 0);

  return {
    partida,
    contribuyente: {
      nombre: texto(row.Titular),
      domicilio: texto(row.Domicilio),
      localidad: texto(row.Localidad),
      codigoPostal: texto(row["C.P."] || row.CP),
    },
    objeto: {
      catastro: texto(row.Catastro),
      parcela: texto(row.Parcela),
      metrosConstruidos: Number.isFinite(metros) ? metros : undefined,
      zona: texto(row.Zon),
    },
    anio: year,
    cuota: month,
    recibo: texto(row.Recibo),
    debito: texto(row.Debito) || undefined,
    mensajeDeuda: texto(row.DeudaTexto) || undefined,
    mensajeBoleta: texto(row["TEXTO-2"] || row.TEXTO2) || undefined,
    codigosPago: {
      pagoMisCuentas: texto(row.Banelco),
      redLink: texto(row.RedLink),
    },
    conceptosCompactos,
    importeCentavos: firstAmount,
    vencimientos: [
      { orden: 1, fecha: firstDate, importeCentavos: firstAmount, codigoBarra: firstBarcode },
      { orden: 2, fecha: secondDate, importeCentavos: secondAmount, codigoBarra: secondBarcode },
    ],
    activa: true,
  };
}

async function reportProgress(onProgress, patch) {
  if (typeof onProgress === "function") {
    try {
      await onProgress(patch);
    } catch (_) {
      /* ignore */
    }
  }
}

function ramMb() {
  return Math.round(process.memoryUsage().rss / (1024 * 1024));
}

async function* filasExcel(filePath) {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(fs.createReadStream(filePath), {
    entries: "emit",
    sharedStrings: "cache",
    hyperlinks: "ignore",
    styles: "ignore",
    worksheets: "emit",
  });
  let primeraHoja = true;
  for await (const worksheetReader of reader) {
    if (!primeraHoja) continue;
    primeraHoja = false;
    for await (const row of worksheetReader) {
      yield row;
    }
  }
}

async function analizarYConstruir(filePath, { collectDocs = true, onBatch, onProgress } = {}) {
  const resultado = {
    formato: "desconocido",
    cantidadEntradas: 0,
    cantidadObjetos: 0,
    cantidadErrores: 0,
    cantidadAdvertencias: 0,
    observaciones: [],
    observacionesOmitidas: 0,
    periodos: [],
    docs: [],
    cantidadImportadas: 0,
  };

  const stat = await fs.promises.stat(filePath).catch(() => null);
  const sizeMb = stat ? (stat.size / 1024 / 1024).toFixed(1) : "?";
  const started = Date.now();
  console.log(`Import urbana: stream XLSX (${sizeMb} MB, ${ramMb()} MB RAM)`);
  await reportProgress(onProgress, {
    etapa: "leyendo",
    porcentaje: 5,
    mensaje: `Leyendo el Excel en streaming (${sizeMb} MB). Las boletas se guardan de a lotes.`,
  });

  const seen = new Map();
  const partidas = new Set();
  const periods = new Set();
  const periodKeys = new Set();
  const BATCH_SIZE = 200;
  let batch = [];
  let detected = null;
  let hayHoja = false;
  let filasLeidas = 0;

  async function flushBatch() {
    if (!batch.length || typeof onBatch !== "function") {
      batch = [];
      return;
    }
    const size = batch.length;
    await onBatch(batch);
    resultado.cantidadImportadas += size;
    batch = [];
    const pct = 10 + Math.min(80, Math.floor((80 * resultado.cantidadImportadas) / 110000));
    await reportProgress(onProgress, {
      etapa: "importando",
      procesadas: resultado.cantidadImportadas,
      total: 0,
      porcentaje: pct,
      mensaje: `Importadas ${resultado.cantidadImportadas.toLocaleString("es-AR")} boletas… ${ramMb()} MB RAM`,
    });
  }

  hayHoja = true;
  for await (const row of filasExcel(filePath)) {
    const rowNumber = row.number || 0;
    filasLeidas += 1;
    if (!detected) {
      if (rowNumber > 15) break;
      detected = detectarCabeceraEnEncabezados(encabezadosDeFila(row));
      if (detected) {
        resultado.formato = "urbana";
        resultado.headerRow = rowNumber;
        console.log(`Import urbana: cabecera en fila ${rowNumber}, ${ramMb()} MB RAM`);
      }
      continue;
    }
    if (detected.faltantes?.length) continue;
    const data = filaComoObjetoDesdeValores(row.values || [], detected.headers);
    if (!Object.values(data).some((value) => texto(value))) continue;
    resultado.cantidadEntradas += 1;

    const doc = construirDoc(data, rowNumber, resultado);
    if (!doc) continue;

    const key = `${doc.partida}|${doc.anio}|${doc.cuota}`;
    if (seen.has(key)) {
      agregarObservacion(
        resultado,
        "error",
        rowNumber,
        "Partida / período",
        `Registro duplicado; también aparece en la fila ${seen.get(key)}.`
      );
      continue;
    }
    seen.set(key, rowNumber);
    partidas.add(doc.partida);
    periods.add(`${String(doc.cuota).padStart(2, "0")}/${doc.anio}`);
    periodKeys.add(`${doc.anio}|${doc.cuota}`);

    if (collectDocs) resultado.docs.push(doc);
    if (typeof onBatch === "function") {
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) await flushBatch();
    }

    if (filasLeidas % 2000 === 0) {
      console.log(
        `Import urbana: fila ${rowNumber}, importadas ${resultado.cantidadImportadas}, ${ramMb()} MB RAM`
      );
    }
  }

  if (!hayHoja) {
    agregarObservacion(resultado, "error", null, "Archivo", "El archivo no contiene hojas.");
    return resultado;
  }
  if (!detected) {
    agregarObservacion(
      resultado,
      "error",
      null,
      "Formato",
      "No se reconoció una plantilla válida de tasa urbana."
    );
    return resultado;
  }
  if (detected.faltantes?.length) {
    detected.faltantes.forEach((header) => {
      agregarObservacion(resultado, "error", resultado.headerRow, header, "Falta una columna obligatoria.");
    });
    return resultado;
  }

  await flushBatch();
  resultado.cantidadObjetos = partidas.size;
  resultado.periodos = Array.from(periods).sort();
  resultado.periodKeys = Array.from(periodKeys);
  console.log(
    `Import urbana: stream listo en ${Math.round((Date.now() - started) / 1000)}s, ${ramMb()} MB RAM`
  );
  return resultado;
}

exports.importarArchivo = async function importarArchivo({
  filePath,
  fileName,
  onProgress,
} = {}) {
  const mongoose = require("mongoose");
  const importBatchId = new mongoose.Types.ObjectId();
  const periodKeys = new Set();

  await reportProgress(onProgress, {
    etapa: "iniciando",
    porcentaje: 3,
    mensaje: "Preparando la importación...",
    importBatchId: String(importBatchId),
  });

  const analisis = await analizarYConstruir(filePath, {
    collectDocs: false,
    onProgress,
    onBatch: async (batch) => {
      for (const doc of batch) {
        doc.importBatchId = importBatchId;
        doc.activa = false;
        periodKeys.add(`${doc.anio}|${doc.cuota}`);
      }
      await TasaUrbanaDeuda.insertMany(batch, { ordered: false });
      console.log(
        `Import urbana: lote ${batch.length} insertado, ${ramMb()} MB RAM (batch ${importBatchId})`
      );
    },
  });

  if (!analisis.cantidadImportadas) {
    console.error(
      "Import urbana sin filas válidas:",
      analisis.observaciones.slice(0, 10).map((o) => `${o.columna}: ${o.mensaje}`)
    );
    const err = new Error(
      analisis.cantidadErrores
        ? "El archivo no tiene filas válidas para importar. Revisá titular, recibo, ambos vencimientos, códigos de barra, Banelco y Red Link."
        : "No se encontraron boletas urbanas válidas para importar."
    );
    err.status = 400;
    err.analisis = {
      fileName: fileName || null,
      formato: analisis.formato,
      cantidadEntradas: analisis.cantidadEntradas,
      cantidadObjetos: 0,
      cantidadErrores: analisis.cantidadErrores,
      cantidadAdvertencias: analisis.cantidadAdvertencias,
      cantidadImportadas: 0,
      periodos: analisis.periodos,
      observaciones: analisis.observaciones.slice(0, 80),
      observacionesOmitidas: analisis.observacionesOmitidas,
      importBatchId,
    };
    throw err;
  }

  await reportProgress(onProgress, {
    etapa: "activando",
    procesadas: analisis.cantidadImportadas,
    total: analisis.cantidadImportadas,
    porcentaje: 92,
    mensaje: "Activando períodos importados...",
  });

  const keys = periodKeys.size
    ? Array.from(periodKeys)
    : analisis.periodKeys || [];
  const filtroPeriodos = {
    $or: keys.map((key) => {
      const [anio, cuota] = key.split("|").map(Number);
      return { anio, cuota };
    }),
  };

  const desactivadas = await TasaUrbanaDeuda.updateMany(
    {
      activa: true,
      importBatchId: { $ne: importBatchId },
      ...filtroPeriodos,
    },
    { $set: { activa: false } }
  );

  await TasaUrbanaDeuda.updateMany(
    { importBatchId },
    { $set: { activa: true } }
  );

  try {
    await fs.promises.unlink(filePath);
  } catch (_) {
    /* ignore */
  }

  console.log(
    `Import urbana OK: ${analisis.cantidadImportadas} boletas, ${analisis.cantidadObjetos} partidas, archivo=${fileName || "-"}`
  );

  return {
    fileName: fileName || null,
    formato: analisis.formato,
    cantidadEntradas: analisis.cantidadEntradas,
    cantidadObjetos: analisis.cantidadObjetos,
    cantidadImportadas: analisis.cantidadImportadas,
    cantidadDesactivadas: desactivadas.modifiedCount || 0,
    cantidadErrores: analisis.cantidadErrores,
    cantidadAdvertencias: analisis.cantidadAdvertencias,
    periodos: analisis.periodos,
    observaciones: analisis.observaciones.slice(0, 40),
    importBatchId,
  };
};

exports.guardarOriginalHabilitado = async function guardarOriginalHabilitado() {
  const config = await Config.findOne({ key: CONFIG_GUARDAR_ORIGINAL });
  return Boolean(config && config.value === true);
};

exports.actualizarConfiguracionGuardarOriginal = async function actualizarConfiguracionGuardarOriginal(value) {
  return Config.findOneAndUpdate(
    { key: CONFIG_GUARDAR_ORIGINAL },
    {
      value: value === true,
      description: "Permite almacenar en S3 el archivo original de importaciones de tasa urbana.",
    },
    { new: true, upsert: true }
  );
};

exports.subirOriginalArchivo = async function subirOriginalArchivo(filePath, importacion, fileName) {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  const safeName = String(fileName || "urbana.xlsx").replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `tasas/urbana/${importacion._id}/${safeName}`;
  const uploaded = await s3.upload({
    Bucket: S3_BUCKET,
    Key: key,
    Body: fs.createReadStream(filePath),
    ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }).promise();
  return { almacenado: true, key, url: uploaded.Location };
};

exports.obtenerArchivoOriginal = async function obtenerArchivoOriginal(importacionId) {
  const importacion = await TasaUrbanaImportacion.findById(importacionId)
    .select("nombreArchivo archivoOriginal")
    .lean();
  if (!importacion) {
    throw Object.assign(new Error("La carga seleccionada no existe."), { status: 404 });
  }
  if (!importacion.archivoOriginal?.almacenado || !importacion.archivoOriginal.key) {
    throw Object.assign(new Error("El archivo original no está disponible para esta carga."), { status: 404 });
  }
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  const object = await s3.getObject({
    Bucket: S3_BUCKET,
    Key: importacion.archivoOriginal.key,
  }).promise();
  return {
    nombreArchivo: importacion.nombreArchivo,
    contentType: object.ContentType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: object.Body,
  };
};

exports.listarHistorial = async function listarHistorial() {
  return TasaUrbanaImportacion.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
};

exports.obtenerProgreso = async function obtenerProgreso(importId) {
  const TasaUrbanaImportacion = require("../models/tasaUrbanaImportacion.model");
  return TasaUrbanaImportacion.findById(importId).lean();
};

exports.listarPeriodosCargados = async function listarPeriodosCargados() {
  const TasaUrbanaImportacion = require("../models/tasaUrbanaImportacion.model");
  return TasaUrbanaDeuda.aggregate([
    {
      $group: {
        _id: { importBatchId: "$importBatchId", anio: "$anio", cuota: "$cuota" },
        cantidadEntradas: { $sum: 1 },
        cantidadActivas: { $sum: { $cond: ["$activa", 1, 0] } },
        actualizadoAt: { $max: "$updatedAt" },
      },
    },
    {
      $lookup: {
        from: TasaUrbanaImportacion.collection.name,
        localField: "_id.importBatchId",
        foreignField: "importBatchId",
        as: "importacion",
      },
    },
    {
      $addFields: {
        importacion: { $arrayElemAt: ["$importacion", 0] },
      },
    },
    {
      $project: {
        _id: 0,
        importBatchId: "$_id.importBatchId",
        importacionId: "$importacion._id",
        anio: "$_id.anio",
        cuota: "$_id.cuota",
        periodo: {
          $concat: [
            {
              $cond: [{ $lt: ["$_id.cuota", 10] }, "0", ""],
            },
            { $toString: "$_id.cuota" },
            "/",
            { $toString: "$_id.anio" },
          ],
        },
        cantidadEntradas: 1,
        habilitado: { $gt: ["$cantidadActivas", 0] },
        actualizadoAt: 1,
        nombreArchivo: {
          $ifNull: ["$importacion.nombreArchivo", "Carga sin nombre"],
        },
        estadoImportacion: {
          $ifNull: ["$importacion.estado", "completada"],
        },
        publicadoAt: {
          $ifNull: ["$importacion.updatedAt", "$actualizadoAt"],
        },
      },
    },
    { $sort: { anio: -1, cuota: 1, habilitado: -1, publicadoAt: -1 } },
  ]);
};

exports.cambiarEstadoPeriodo = async function cambiarEstadoPeriodo({
  importBatchId,
  anio,
  cuota,
  habilitar,
}) {
  const anioNum = Number(anio);
  const cuotaNum = Number(cuota);
  if (!importBatchId || !anioNum || !cuotaNum) {
    const err = new Error("Faltan importBatchId, anio o cuota.");
    err.status = 400;
    throw err;
  }

  const filtro = {
    importBatchId,
    anio: anioNum,
    cuota: cuotaNum,
  };
  const objetivo = await TasaUrbanaDeuda.countDocuments(filtro);
  if (!objetivo) {
    const err = new Error("No hay boletas para ese período en la carga indicada.");
    err.status = 404;
    throw err;
  }

  if (habilitar) {
    await TasaUrbanaDeuda.updateMany(
      {
        anio: anioNum,
        cuota: cuotaNum,
        activa: true,
        importBatchId: { $ne: importBatchId },
      },
      { $set: { activa: false } }
    );
    await TasaUrbanaDeuda.updateMany(filtro, { $set: { activa: true } });
  } else {
    await TasaUrbanaDeuda.updateMany(filtro, { $set: { activa: false } });
  }

  return {
    importBatchId,
    anio: anioNum,
    cuota: cuotaNum,
    periodo: `${String(cuotaNum).padStart(2, "0")}/${anioNum}`,
    habilitado: habilitar === true,
  };
};

exports.CONCEPTOS_URBANA = CONCEPTOS_URBANA;
