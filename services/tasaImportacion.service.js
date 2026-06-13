const crypto = require("crypto");
const ExcelJS = require("exceljs");
const AWS = require("aws-sdk");
const mongoose = require("mongoose");
const Config = require("../models/configs.model");
const TasaImportacion = require("../models/tasaImportacion.model");
const TasaBoleta = require("../models/tasaBoleta.model");

const MAX_OBSERVACIONES = 5000;
const S3_BUCKET = process.env.AWS_BUCKET || "haciendagesell";

const FIRMAS = {
  completo: ["Contribuyente", "Dominio", "Mes", "Patente", "$ 1er.Vto.", "1er.Vto."],
  simplificado: ["Contribuyente", "Dominio", "Cuota", "Deu", "$ 1er.Vto.", "1er.Vto."],
  urbana: ["Titular", "Partida", "Catastro", "$1erVto", "F-1erVto", "CodBarra-1erVto"],
};

const REQUERIDAS = {
  completo: [
    "Contribuyente", "Domicilio", "Localidad", "CP", "Dominio", "Categoria", "Marca",
    "Modelo", "Model", "DeudaTexto", "Mes", "Año", "Recibo", "Patente", "$ 1er.Vto.",
    "$ 2do.Vto.", "1er.Vto.", "2do.Vto.", "Cod.Barra", "Pago Mis Cuentas", "Red Link",
  ],
  simplificado: [
    "Contribuyente", "Domicilio", "Localidad", "CP", "Recibo", "Dominio", "Categoria",
    "Marca", "Modelo", "Año", "Cuota", "$ 1er.Vto.", "$ 2do.Vto.", "1er.Vto.",
    "2do.Vto.", "Cod.Barra", "Pago Mis Cuentas", "Red Link",
  ],
};

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

function agregarObservacion(resultado, tipo, fila, columna, mensaje) {
  if (tipo === "error") resultado.cantidadErrores += 1;
  else resultado.cantidadAdvertencias += 1;

  if (resultado.observaciones.length < MAX_OBSERVACIONES) {
    resultado.observaciones.push({ tipo, fila, columna, mensaje });
  } else {
    resultado.observacionesOmitidas += 1;
  }
}

function detectarFormato(worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(10, worksheet.rowCount); rowNumber += 1) {
    const headers = worksheet.getRow(rowNumber).values.slice(1).map(texto);
    for (const formato of ["urbana", "completo", "simplificado"]) {
      if (FIRMAS[formato].every((header) => headers.includes(header))) {
        return { formato, headerRow: rowNumber, headers };
      }
    }
  }
  return null;
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

function normalizarFila(row, formato) {
  if (formato === "completo") return row;
  const cuota = texto(row.Cuota).match(/^(\d{1,2})[/-](\d{4})$/);
  return {
    ...row,
    Mes: cuota ? cuota[1] : "",
    Año: cuota ? cuota[2] : "",
    Model: row.Año,
    Patente: row["$ 1er.Vto."],
    DeudaTexto: texto(row.Deu).toUpperCase() === "S" ? "Esta Partida Registra Deuda Anterior" : "",
  };
}

function codigosBarra(row) {
  return Object.keys(row)
    .filter((key) => key === "Cod.Barra" || key.startsWith("Cod.Barra_"))
    .map((key) => texto(row[key]))
    .filter(Boolean);
}

function construirBoleta(row, importacionId) {
  const dominio = texto(row.Dominio).replace(/[\s-]/g, "").toUpperCase();
  const mes = Number(row.Mes);
  const anio = Number(row.Año);
  const bars = codigosBarra(row);
  return {
    tipoTasa: "AUTOMOTORES",
    importacionId,
    objetoClave: dominio,
    anio,
    cuota: mes,
    periodo: `${String(mes).padStart(2, "0")}/${anio}`,
    contribuyente: {
      nombre: texto(row.Contribuyente),
      domicilio: texto(row.Domicilio),
      localidad: texto(row.Localidad),
      codigoPostal: texto(row.CP),
    },
    objeto: {
      dominio,
      categoria: texto(row.Categoria),
      marca: texto(row.Marca),
      modelo: texto(row.Modelo),
      anioModelo: Number(row.Model) || undefined,
    },
    recibo: texto(row.Recibo),
    mensajeDeuda: texto(row.DeudaTexto),
    importeCentavos: importeCentavos(row.Patente),
    vencimientos: [
      { orden: 1, fecha: fecha(row["1er.Vto."]), importeCentavos: importeCentavos(row["$ 1er.Vto."]), codigoBarra: bars[0] },
      { orden: 2, fecha: fecha(row["2do.Vto."]), importeCentavos: importeCentavos(row["$ 2do.Vto."]), codigoBarra: bars[1] },
    ],
    codigosPago: {
      pagoMisCuentas: texto(row["Pago Mis Cuentas"]),
      redLink: texto(row["Red Link"]),
    },
    activa: false,
  };
}

async function analizarBuffer(buffer, { incluirBoletas = false } = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
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
    boletas: [],
  };

  if (!worksheet) {
    agregarObservacion(resultado, "error", null, "Archivo", "El archivo no contiene hojas.");
    return resultado;
  }

  const detected = detectarFormato(worksheet);
  if (!detected) {
    agregarObservacion(resultado, "error", null, "Formato", "No se reconoció una plantilla válida de Automotores.");
    return resultado;
  }
  if (detected.formato === "urbana") {
    agregarObservacion(resultado, "error", null, "Formato", "El archivo corresponde a Tasas Urbanas. Actualmente sólo se admite Automotores.");
    return resultado;
  }

  resultado.formato = detected.formato;
  const missing = REQUERIDAS[detected.formato].filter((header) => !detected.headers.includes(header));
  missing.forEach((header) => agregarObservacion(resultado, "error", detected.headerRow, header, "Falta una columna obligatoria."));
  if (missing.length) return resultado;

  const seen = new Map();
  const domains = new Set();
  const periods = new Set();
  const lastRow = worksheet.actualRowCount || worksheet.rowCount;

  for (let rowNumber = detected.headerRow + 1; rowNumber <= lastRow; rowNumber += 1) {
    const raw = filaComoObjeto(worksheet.getRow(rowNumber), detected.headers);
    if (!Object.values(raw).some((value) => texto(value))) continue;
    resultado.cantidadEntradas += 1;
    const row = normalizarFila(raw, detected.formato);
    const domain = texto(row.Dominio).replace(/[\s-]/g, "").toUpperCase();
    const month = Number(row.Mes);
    const year = Number(row.Año);
    const firstAmount = importeCentavos(row["$ 1er.Vto."]);
    const secondAmount = importeCentavos(row["$ 2do.Vto."]);
    const importeTasa = importeCentavos(row.Patente);
    const firstDate = fecha(row["1er.Vto."]);
    const secondDate = fecha(row["2do.Vto."]);
    const bars = codigosBarra(row);

    if (!texto(row.Contribuyente)) agregarObservacion(resultado, "error", rowNumber, "Contribuyente", "El contribuyente es obligatorio.");
    if (!domain) agregarObservacion(resultado, "error", rowNumber, "Dominio", "El dominio es obligatorio.");
    else if (!/^[A-Z0-9]{5,10}$/.test(domain)) agregarObservacion(resultado, "error", rowNumber, "Dominio", "Debe contener entre 5 y 10 caracteres alfanuméricos.");
    if (!texto(row.Domicilio)) agregarObservacion(resultado, "advertencia", rowNumber, "Domicilio", "El domicilio está vacío.");
    if (!texto(row.Localidad)) agregarObservacion(resultado, "advertencia", rowNumber, "Localidad", "La localidad está vacía.");
    if (!Number.isInteger(month) || month < 1 || month > 12) agregarObservacion(resultado, "error", rowNumber, "Mes", "Debe ser un mes entre 01 y 12.");
    if (!Number.isInteger(year) || year < 1900 || year > 2200) agregarObservacion(resultado, "error", rowNumber, "Año", "Debe ser un año válido de cuatro dígitos.");
    if (!texto(row.Recibo)) agregarObservacion(resultado, "error", rowNumber, "Recibo", "El número de recibo es obligatorio.");
    if (importeTasa == null || importeTasa < 0) agregarObservacion(resultado, "error", rowNumber, "Patente", "Debe ser un importe válido mayor o igual a cero.");
    if (firstAmount == null || firstAmount < 0) agregarObservacion(resultado, "error", rowNumber, "$ 1er.Vto.", "Debe ser un importe válido mayor o igual a cero.");
    if (secondAmount == null || secondAmount < 0) agregarObservacion(resultado, "error", rowNumber, "$ 2do.Vto.", "Debe ser un importe válido mayor o igual a cero.");
    if (importeTasa != null && firstAmount != null && importeTasa !== firstAmount) agregarObservacion(resultado, "advertencia", rowNumber, "$ 1er.Vto.", "No coincide con el importe de Patente.");
    if (firstAmount != null && secondAmount != null && secondAmount < firstAmount) agregarObservacion(resultado, "advertencia", rowNumber, "$ 2do.Vto.", "Es menor que el primer vencimiento.");
    if (!firstDate) agregarObservacion(resultado, "error", rowNumber, "1er.Vto.", "La fecha del primer vencimiento no es válida.");
    if (!secondDate) agregarObservacion(resultado, "error", rowNumber, "2do.Vto.", "La fecha del segundo vencimiento no es válida.");
    if (firstDate && secondDate && secondDate < firstDate) agregarObservacion(resultado, "error", rowNumber, "2do.Vto.", "Es anterior al primer vencimiento.");
    if (bars.length < 2 || bars.some((bar) => !/^[A-Z0-9]+$/i.test(bar))) agregarObservacion(resultado, "error", rowNumber, "Cod.Barra", "Deben existir dos códigos de barra alfanuméricos válidos.");

    if (domain && Number.isInteger(month) && Number.isInteger(year)) {
      const key = `${domain}|${year}|${month}`;
      if (seen.has(key)) agregarObservacion(resultado, "error", rowNumber, "Dominio / período", `Registro duplicado; también aparece en la fila ${seen.get(key)}.`);
      else seen.set(key, rowNumber);
      domains.add(domain);
      periods.add(`${String(month).padStart(2, "0")}/${year}`);
    }

    if (incluirBoletas) resultado.boletas.push(construirBoleta(row, null));
  }

  resultado.cantidadObjetos = domains.size;
  resultado.periodos = Array.from(periods).sort();
  return resultado;
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function guardarOriginalHabilitado() {
  const config = await Config.findOne({ key: "guardarArchivoOriginalTasas" });
  return Boolean(config && config.value === true);
}

async function subirOriginal(buffer, importacion, fileName) {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `tasas/automotores/${importacion._id}/${safeName}`;
  const uploaded = await s3.upload({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }).promise();
  return { almacenado: true, key, url: uploaded.Location };
}

async function crearIntento({ buffer, fileName, user }) {
  const result = await analizarBuffer(buffer);
  const importacion = await TasaImportacion.create({
    tipoTasa: "AUTOMOTORES",
    nombreArchivo: fileName,
    tamanoBytes: buffer.length,
    hashArchivo: hashBuffer(buffer),
    formato: result.formato,
    estado: result.cantidadErrores ? "rechazada" : "analizada",
    periodos: result.periodos,
    periodosActivos: [],
    cantidadEntradas: result.cantidadEntradas,
    cantidadObjetos: result.cantidadObjetos,
    cantidadErrores: result.cantidadErrores,
    cantidadAdvertencias: result.cantidadAdvertencias,
    observaciones: result.observaciones,
    observacionesOmitidas: result.observacionesOmitidas,
    subidoPor: { id: user._id, username: user.username },
  });
  return importacion;
}

async function publicar({ importacionId, buffer, confirmarReemplazo, guardarOriginal, user }) {
  const importacion = await TasaImportacion.findById(importacionId);
  if (!importacion) throw Object.assign(new Error("Intento de importación no encontrado."), { status: 404 });
  if (importacion.estado !== "analizada") throw Object.assign(new Error("La importación ya no puede publicarse."), { status: 409 });
  if (hashBuffer(buffer) !== importacion.hashArchivo) throw Object.assign(new Error("El archivo no coincide con el archivo analizado."), { status: 409 });

  const result = await analizarBuffer(buffer, { incluirBoletas: true });
  if (result.cantidadErrores) throw Object.assign(new Error("El archivo contiene errores y no puede publicarse."), { status: 422, result });

  const conflictos = await TasaBoleta.distinct("periodo", {
    tipoTasa: "AUTOMOTORES",
    periodo: { $in: result.periodos },
    activa: true,
  });
  if (conflictos.length && !confirmarReemplazo) {
    throw Object.assign(new Error("Existen períodos publicados que serán reemplazados."), { status: 409, conflictos });
  }

  const session = await mongoose.startSession();
  let original = { almacenado: false };
  try {
    await session.withTransaction(async () => {
      result.boletas.forEach((boleta) => { boleta.importacionId = importacion._id; });
      await TasaBoleta.insertMany(result.boletas, { session });
      await TasaBoleta.updateMany(
        { tipoTasa: "AUTOMOTORES", periodo: { $in: result.periodos }, activa: true, importacionId: { $ne: importacion._id } },
        { $set: { activa: false } },
        { session }
      );
      await TasaBoleta.updateMany({ importacionId: importacion._id }, { $set: { activa: true } }, { session });

      const anteriores = await TasaImportacion.find({
        _id: { $ne: importacion._id },
        estado: { $in: ["publicada", "reemplazada_parcialmente"] },
        periodosActivos: { $in: result.periodos },
      }).session(session);
      for (const anterior of anteriores) {
        anterior.periodosActivos = anterior.periodosActivos.filter((periodo) => !result.periodos.includes(periodo));
        anterior.estado = anterior.periodosActivos.length ? "reemplazada_parcialmente" : "reemplazada";
        await anterior.save({ session });
      }

      importacion.estado = "publicada";
      importacion.periodosActivos = result.periodos;
      importacion.publicadoPor = { id: user._id, username: user.username };
      importacion.publicadoAt = new Date();
      await importacion.save({ session });
    });

    let archivoOriginalError = null;
    if (guardarOriginal && await guardarOriginalHabilitado()) {
      try {
        original = await subirOriginal(buffer, importacion, importacion.nombreArchivo);
        importacion.archivoOriginal = original;
        await importacion.save();
      } catch (error) {
        archivoOriginalError = error.message;
      }
    }
    return { importacion, conflictos, archivoOriginal: original, archivoOriginalError };
  } finally {
    await session.endSession();
  }
}

async function actualizarConfiguracionGuardarOriginal(value) {
  return Config.findOneAndUpdate(
    { key: "guardarArchivoOriginalTasas" },
    {
      value: Boolean(value),
      description: "Permite almacenar en S3 el archivo original de importaciones de tasas publicadas.",
    },
    { new: true, upsert: true }
  );
}

module.exports = {
  analizarBuffer,
  crearIntento,
  publicar,
  guardarOriginalHabilitado,
  actualizarConfiguracionGuardarOriginal,
};
