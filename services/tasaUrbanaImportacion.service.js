const fs = require("fs");
const ExcelJS = require("exceljs");
const TasaUrbanaDeuda = require("../models/tasaUrbanaDeuda.model");

const MAX_OBSERVACIONES = 200;
const FIRMA_URBANA = ["Titular", "Partida", "Catastro", "$1erVto", "F-1erVto", "CodBarra-1erVto"];
const FIRMA_URBANA_MINIMA = ["Partida", "$1erVto", "CodBarra-1erVto"];

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

function filaComoObjeto(row, headers) {
  const result = {};
  headers.forEach((header, index) => {
    if (!header) return;
    let key = header;
    let suffix = 1;
    while (Object.prototype.hasOwnProperty.call(result, key)) {
      key = `${header}_${suffix}`;
      suffix += 1;
    }
    result[key] = valorCelda(row.getCell(index + 1));
  });
  return result;
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

function detectarCabecera(worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(15, worksheet.rowCount); rowNumber += 1) {
    const headers = worksheet.getRow(rowNumber).values.slice(1).map(texto);
    if (FIRMA_URBANA.every((header) => headers.includes(header))) {
      return { headerRow: rowNumber, headers, nivel: "completo" };
    }
    if (FIRMA_URBANA_MINIMA.every((header) => headers.includes(header))) {
      return { headerRow: rowNumber, headers, nivel: "minimo" };
    }
  }
  return null;
}

function fechaDefault(anio, mes, dia = 15) {
  if (!Number.isInteger(anio) || !Number.isInteger(mes)) return new Date();
  return new Date(anio, mes - 1, dia);
}

function construirDoc(row, rowNumber, resultado) {
  const partida = texto(row.Partida).replace(/\s/g, "").toUpperCase();
  const month = Number(row.Mes);
  const year = Number(row.Año);
  const firstAmount = importeCentavos(row["$1erVto"]);
  const secondAmount = importeCentavos(row["$2doVto"]);
  const firstDate = fecha(row["F-1erVto"]) || fechaDefault(year, month, 15);
  const secondDate = fecha(row["F-2doVto"]) || fechaDefault(year, month, 28);
  const firstBarcode = texto(row["CodBarra-1erVto"]);
  const secondBarcode = texto(row["CodBarra-2doVto"]);

  let ok = true;
  if (!partida || !/^[A-Z0-9]{1,16}$/.test(partida)) {
    agregarObservacion(resultado, "error", rowNumber, "Partida", "Partida inválida o vacía.");
    ok = false;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    agregarObservacion(resultado, "error", rowNumber, "Mes", "Mes inválido.");
    ok = false;
  }
  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    agregarObservacion(resultado, "error", rowNumber, "Año", "Año inválido.");
    ok = false;
  }
  if (firstAmount == null || firstAmount < 0) {
    agregarObservacion(resultado, "error", rowNumber, "$1erVto", "Importe del 1er vencimiento inválido.");
    ok = false;
  }
  if (!firstBarcode) {
    agregarObservacion(resultado, "error", rowNumber, "CodBarra-1erVto", "Falta el código de barras del 1er vencimiento.");
    ok = false;
  }

  if (!texto(row.Titular)) {
    agregarObservacion(resultado, "advertencia", rowNumber, "Titular", "Titular vacío.");
  }
  if (!texto(row.Banelco)) {
    agregarObservacion(resultado, "advertencia", rowNumber, "Banelco", "Sin código Banelco/PMC.");
  }
  if (!texto(row.RedLink)) {
    agregarObservacion(resultado, "advertencia", rowNumber, "RedLink", "Sin código Red Link.");
  }
  if (!texto(row.Recibo)) {
    agregarObservacion(resultado, "advertencia", rowNumber, "Recibo", "Recibo vacío.");
  }

  if (!ok) return null;

  const vencimientos = [
    {
      orden: 1,
      fecha: firstDate,
      importeCentavos: firstAmount,
      codigoBarra: firstBarcode,
    },
  ];
  if (secondBarcode && secondAmount != null && secondAmount >= 0) {
    vencimientos.push({
      orden: 2,
      fecha: secondDate,
      importeCentavos: secondAmount,
      codigoBarra: secondBarcode,
    });
  }

  const metros = Number(String(row.Const ?? "").replace(",", "."));
  const conceptosCompactos = CONCEPTOS_URBANA.map(([codigo], index) => [
    index,
    importeCentavos(row[codigo]),
  ]).filter((item) => item[1] != null && item[1] !== 0);

  return {
    partida,
    contribuyente: {
      nombre: texto(row.Titular) || "SIN TITULAR",
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
    recibo: texto(row.Recibo) || undefined,
    debito: texto(row.Debito) || undefined,
    mensajeDeuda: texto(row.DeudaTexto) || undefined,
    mensajeBoleta: texto(row["TEXTO-2"] || row.TEXTO2) || undefined,
    codigosPago: {
      pagoMisCuentas: texto(row.Banelco) || undefined,
      redLink: texto(row.RedLink) || undefined,
    },
    conceptosCompactos,
    importeCentavos: firstAmount,
    vencimientos,
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

async function leerWorkbook(filePath, onProgress) {
  const started = Date.now();
  const stat = await fs.promises.stat(filePath).catch(() => null);
  const sizeMb = stat ? (stat.size / 1024 / 1024).toFixed(1) : "?";
  console.log(`Import urbana: leyendo XLSX (${sizeMb} MB, ${ramMb()} MB RAM)`);
  await reportProgress(onProgress, {
    etapa: "leyendo",
    porcentaje: 5,
    mensaje: `Leyendo el Excel (${sizeMb} MB). Se carga entero en memoria antes de guardar boletas.`,
  });
  let ticking = false;
  const timer = setInterval(() => {
    if (ticking) return;
    ticking = true;
    const s = Math.round((Date.now() - started) / 1000);
    const msg = `Leyendo el Excel (${sizeMb} MB)… ${s} s, ${ramMb()} MB RAM. Todavía no se guardaron boletas.`;
    console.log(`Import urbana: ${msg}`);
    reportProgress(onProgress, { etapa: "leyendo", porcentaje: 5, mensaje: msg }).finally(() => {
      ticking = false;
    });
  }, 10000);
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const elapsed = Math.round((Date.now() - started) / 1000);
    const worksheet = workbook.worksheets[0];
    const rows = worksheet ? worksheet.actualRowCount || worksheet.rowCount || 0 : 0;
    console.log(`Import urbana: Excel leído en ${elapsed}s (~${rows} filas, ${ramMb()} MB RAM)`);
    await reportProgress(onProgress, {
      etapa: "leyendo",
      porcentaje: 8,
      mensaje: `Excel leído en ${elapsed} s (~${Number(rows).toLocaleString("es-AR")} filas). Empieza el guardado…`,
    });
    return workbook;
  } finally {
    clearInterval(timer);
  }
}

async function analizarYConstruir(filePath, { collectDocs = true, onBatch, onProgress } = {}) {
  const workbook = await leerWorkbook(filePath, onProgress);
  const worksheet = workbook.worksheets[0];
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

  if (!worksheet) {
    agregarObservacion(resultado, "error", null, "Archivo", "El archivo no contiene hojas.");
    return resultado;
  }

  const detected = detectarCabecera(worksheet);
  if (!detected) {
    agregarObservacion(
      resultado,
      "error",
      null,
      "Formato",
      "No se reconoció plantilla de tasa urbana. Se esperan columnas Partida, $1erVto y CodBarra-1erVto."
    );
    return resultado;
  }

  resultado.formato = `urbana-${detected.nivel}`;
  const seen = new Map();
  const partidas = new Set();
  const periods = new Set();
  const periodKeys = new Set();
  const lastRow = worksheet.actualRowCount || worksheet.rowCount;
  const totalEstimado = Math.max(1, lastRow - detected.headerRow);
  const BATCH_SIZE = 400;
  let batch = [];

  await reportProgress(onProgress, {
    etapa: "importando",
    procesadas: 0,
    total: totalEstimado,
    porcentaje: 10,
    mensaje: `Procesando hasta ~${totalEstimado.toLocaleString("es-AR")} filas...`,
  });

  async function flushBatch() {
    if (!batch.length || typeof onBatch !== "function") {
      batch = [];
      return;
    }
    const size = batch.length;
    await onBatch(batch);
    resultado.cantidadImportadas += size;
    batch = [];
    const pct = 10 + Math.min(80, Math.floor((80 * resultado.cantidadImportadas) / totalEstimado));
    await reportProgress(onProgress, {
      etapa: "importando",
      procesadas: resultado.cantidadImportadas,
      total: totalEstimado,
      porcentaje: pct,
      mensaje: `Importadas ${resultado.cantidadImportadas.toLocaleString("es-AR")} boletas...`,
    });
  }

  for (let rowNumber = detected.headerRow + 1; rowNumber <= lastRow; rowNumber += 1) {
    const row = filaComoObjeto(worksheet.getRow(rowNumber), detected.headers);
    if (!Object.values(row).some((value) => texto(value))) continue;
    resultado.cantidadEntradas += 1;

    const doc = construirDoc(row, rowNumber, resultado);
    if (!doc) continue;

    const key = `${doc.partida}|${doc.anio}|${doc.cuota}`;
    if (seen.has(key)) {
      agregarObservacion(
        resultado,
        "advertencia",
        rowNumber,
        "Partida / período",
        `Duplicado de la fila ${seen.get(key)}; se conserva la primera.`
      );
      continue;
    }
    seen.set(key, rowNumber);
    partidas.add(doc.partida);
    periods.add(`${String(doc.cuota).padStart(2, "0")}/${doc.anio}`);
    periodKeys.add(`${doc.anio}|${doc.cuota}`);

    if (collectDocs) {
      resultado.docs.push(doc);
    }

    if (typeof onBatch === "function") {
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) {
        await flushBatch();
      }
    }
  }

  await flushBatch();

  resultado.cantidadObjetos = partidas.size;
  resultado.periodos = Array.from(periods).sort();
  resultado.periodKeys = Array.from(periodKeys);
  // Liberar referencia al workbook lo antes posible.
  workbook.removeWorksheet(worksheet.id);
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
        ? "El archivo no tiene filas válidas para importar (revisá Partida, Mes, Año, $1erVto y CodBarra-1erVto)."
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

exports.listarHistorial = async function listarHistorial() {
  const TasaUrbanaImportacion = require("../models/tasaUrbanaImportacion.model");
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
