const crypto = require("crypto");
const fs = require("fs");
const ExcelJS = require("exceljs");
const AWS = require("aws-sdk");
const mongoose = require("mongoose");
const Config = require("../models/configs.model");
const TasaImportacion = require("../models/tasaImportacion.model");
const TasaBoleta = require("../models/tasaBoleta.model");
const TasaObjeto = require("../models/tasaObjeto.model");
const TasaMensaje = require("../models/tasaMensaje.model");
const TasaCatalogo = require("./tasaCatalogo.service");

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
  urbana: [
    "Titular", "Partida", "Catastro", "Mes", "Año", "Recibo", "$1erVto", "$2doVto",
    "F-1erVto", "F-2doVto", "CodBarra-1erVto", "CodBarra-2doVto", "Banelco", "RedLink",
  ],
};

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

function construirBoleta(row, importacionId, tipoTasa = "AUTOMOTORES") {
  const dominio = texto(row.Dominio).replace(/[\s-]/g, "").toUpperCase();
  const mes = Number(row.Mes);
  const anio = Number(row.Año);
  const bars = codigosBarra(row);
  return {
    tipoTasa,
    importacionId,
    objetoClave: dominio,
    anio,
    cuota: mes,
    _datosObjeto: {
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
      mensajeDeuda: texto(row.DeudaTexto),
      mensajeBoleta: "",
      codigosPago: {
        pagoMisCuentas: texto(row["Pago Mis Cuentas"]),
        redLink: texto(row["Red Link"]),
      },
    },
    recibo: texto(row.Recibo),
    importeCentavos: importeCentavos(row.Patente),
    vencimientos: [
      { orden: 1, fecha: fecha(row["1er.Vto."]), importeCentavos: importeCentavos(row["$ 1er.Vto."]), codigoBarra: bars[0] },
      { orden: 2, fecha: fecha(row["2do.Vto."]), importeCentavos: importeCentavos(row["$ 2do.Vto."]), codigoBarra: bars[1] },
    ],
    activa: false,
  };
}

function construirBoletaUrbana(row, importacionId) {
  const partida = texto(row.Partida).replace(/\s/g, "").toUpperCase();
  const mes = Number(row.Mes);
  const anio = Number(row.Año);
  return {
    tipoTasa: "URBANA",
    importacionId,
    objetoClave: partida,
    anio,
    cuota: mes,
    _datosObjeto: {
      contribuyente: {
        nombre: texto(row.Titular),
        domicilio: texto(row.Domicilio),
        localidad: texto(row.Localidad),
        codigoPostal: texto(row["C.P."]),
      },
      objeto: {
        partida,
        catastro: texto(row.Catastro),
        parcela: texto(row.Parcela),
        metrosConstruidos: Number(row.Const) || undefined,
        zona: texto(row.Zon),
      },
      mensajeDeuda: texto(row.DeudaTexto),
      mensajeBoleta: texto(row["TEXTO-2"]),
      codigosPago: {
        pagoMisCuentas: texto(row.Banelco),
        redLink: texto(row.RedLink),
      },
    },
    recibo: texto(row.Recibo),
    conceptosCompactos: CONCEPTOS_URBANA
      .map(([codigo], index) => [index, importeCentavos(row[codigo])])
      .filter((item) => item[1] != null && item[1] !== 0),
    importeCentavos: importeCentavos(row["$1erVto"]),
    vencimientos: [
      { orden: 1, fecha: fecha(row["F-1erVto"]), importeCentavos: importeCentavos(row["$1erVto"]), codigoBarra: texto(row["CodBarra-1erVto"]) },
      { orden: 2, fecha: fecha(row["F-2doVto"]), importeCentavos: importeCentavos(row["$2doVto"]), codigoBarra: texto(row["CodBarra-2doVto"]) },
    ],
    activa: false,
  };
}

function analizarFilasUrbanas(worksheet, detected, resultado, incluirBoletas) {
  const seen = new Map();
  const partidas = new Set();
  const periods = new Set();
  const lastRow = worksheet.actualRowCount || worksheet.rowCount;

  for (let rowNumber = detected.headerRow + 1; rowNumber <= lastRow; rowNumber += 1) {
    const row = filaComoObjeto(worksheet.getRow(rowNumber), detected.headers);
    if (!Object.values(row).some((value) => texto(value))) continue;
    resultado.cantidadEntradas += 1;

    const partida = texto(row.Partida).replace(/\s/g, "").toUpperCase();
    const month = Number(row.Mes);
    const year = Number(row.Año);
    const firstAmount = importeCentavos(row["$1erVto"]);
    const secondAmount = importeCentavos(row["$2doVto"]);
    const firstDate = fecha(row["F-1erVto"]);
    const secondDate = fecha(row["F-2doVto"]);
    const firstBarcode = texto(row["CodBarra-1erVto"]);
    const secondBarcode = texto(row["CodBarra-2doVto"]);

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
    if (firstAmount != null && secondAmount != null && secondAmount < firstAmount) agregarObservacion(resultado, "advertencia", rowNumber, "$2doVto", "Es menor que el primer vencimiento.");
    if (!firstDate) agregarObservacion(resultado, "error", rowNumber, "F-1erVto", "La fecha del primer vencimiento no es válida.");
    if (!secondDate) agregarObservacion(resultado, "error", rowNumber, "F-2doVto", "La fecha del segundo vencimiento no es válida.");
    if (firstDate && secondDate && secondDate < firstDate) agregarObservacion(resultado, "error", rowNumber, "F-2doVto", "Es anterior al primer vencimiento.");
    if (!firstBarcode || !/^[A-Z0-9]+$/i.test(firstBarcode)) agregarObservacion(resultado, "error", rowNumber, "CodBarra-1erVto", "El código de barras no es válido.");
    if (!secondBarcode || !/^[A-Z0-9]+$/i.test(secondBarcode)) agregarObservacion(resultado, "error", rowNumber, "CodBarra-2doVto", "El código de barras no es válido.");
    if (!texto(row.Banelco)) agregarObservacion(resultado, "error", rowNumber, "Banelco", "El código de Pago Mis Cuentas es obligatorio.");
    if (!texto(row.RedLink)) agregarObservacion(resultado, "error", rowNumber, "RedLink", "El código de Red Link es obligatorio.");

    if (partida && Number.isInteger(month) && Number.isInteger(year)) {
      const key = `${partida}|${year}|${month}`;
      if (seen.has(key)) agregarObservacion(resultado, "error", rowNumber, "Partida / período", `Registro duplicado; también aparece en la fila ${seen.get(key)}.`);
      else seen.set(key, rowNumber);
      partidas.add(partida);
      periods.add(`${String(month).padStart(2, "0")}/${year}`);
    }
    if (incluirBoletas) resultado.boletas.push(construirBoletaUrbana(row, null));
  }

  resultado.cantidadObjetos = partidas.size;
  resultado.periodos = Array.from(periods).sort();
  return resultado;
}

async function analizarFuente(source, { incluirBoletas = false, tipoTasa = "AUTOMOTORES" } = {}) {
  const workbook = new ExcelJS.Workbook();
  if (Buffer.isBuffer(source)) await workbook.xlsx.load(source);
  else await workbook.xlsx.readFile(source);
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
    agregarObservacion(resultado, "error", null, "Formato", "No se reconoció una plantilla válida para la tasa seleccionada.");
    return resultado;
  }
  const formatoCoincide = tipoTasa === "URBANA"
    ? detected.formato === "urbana"
    : ["completo", "simplificado"].includes(detected.formato);
  if (!formatoCoincide) {
    agregarObservacion(resultado, "error", null, "Formato", `El archivo no corresponde a ${tipoTasa === "URBANA" ? "Tasa Urbana" : "Automotores"}.`);
    return resultado;
  }

  resultado.formato = detected.formato;
  const missing = REQUERIDAS[detected.formato].filter((header) => !detected.headers.includes(header));
  missing.forEach((header) => agregarObservacion(resultado, "error", detected.headerRow, header, "Falta una columna obligatoria."));
  if (missing.length) return resultado;
  if (detected.formato === "urbana") {
    return analizarFilasUrbanas(worksheet, detected, resultado, incluirBoletas);
  }

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

    if (incluirBoletas) resultado.boletas.push(construirBoleta(row, null, tipoTasa));
  }

  resultado.cantidadObjetos = domains.size;
  resultado.periodos = Array.from(periods).sort();
  return resultado;
}

function analizarBuffer(buffer, options) {
  return analizarFuente(buffer, options);
}

function analizarArchivo(filePath, options) {
  return analizarFuente(filePath, options);
}

function periodoPartes(periodo) {
  const [cuota, anio] = String(periodo).split("/").map(Number);
  return { anio, cuota };
}

function filtroPeriodos(periodos) {
  return { $or: periodos.map(periodoPartes) };
}

async function periodosActivosExistentes(tipoTasa, periodos) {
  const rows = await TasaBoleta.aggregate([
    { $match: { tipoTasa, activa: true, ...filtroPeriodos(periodos) } },
    { $group: { _id: { anio: "$anio", cuota: "$cuota" } } },
  ]);
  return rows.map((row) => `${String(row._id.cuota).padStart(2, "0")}/${row._id.anio}`);
}

function escaparRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function nombreArchivoDisponible(fileName, tipoTasa = "AUTOMOTORES") {
  const limpio = texto(fileName).split(/[\\/]/).pop() || "automotores.xlsx";
  const extensionIndex = limpio.lastIndexOf(".");
  const extension = extensionIndex > 0 ? limpio.slice(extensionIndex) : "";
  const nombre = extensionIndex > 0 ? limpio.slice(0, extensionIndex) : limpio;
  const nombreBase = nombre.replace(/--\d+$/, "");
  const coincidenciaFamilia = new RegExp(
    `^${escaparRegex(nombreBase)}(?:--(\\d+))?${escaparRegex(extension)}$`,
    "i"
  );
  const existentes = await TasaImportacion.find({
    tipoTasa,
    nombreArchivo: coincidenciaFamilia,
  }).select("nombreArchivo").lean();

  if (!existentes.some((item) => item.nombreArchivo.toLocaleLowerCase() === limpio.toLocaleLowerCase())) {
    return limpio;
  }

  const numeros = existentes.map((item) => {
    const match = item.nombreArchivo.match(coincidenciaFamilia);
    return match && match[1] ? Number(match[1]) : 1;
  });
  return `${nombreBase}--${Math.max(1, ...numeros) + 1}${extension}`;
}

function claveNombreArchivo(fileName) {
  return texto(fileName).toLocaleLowerCase();
}

async function guardarOriginalHabilitado(tipoTasa = "AUTOMOTORES") {
  const key = `guardarArchivoOriginalTasas:${tipoTasa}`;
  let config = await Config.findOne({ key });
  if (!config && tipoTasa === "AUTOMOTORES") {
    config = await Config.findOne({ key: "guardarArchivoOriginalTasas" });
  }
  return Boolean(config && config.value === true);
}

async function subirOriginalArchivo(filePath, importacion, fileName) {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `tasas/${importacion.tipoTasa.toLocaleLowerCase()}/${importacion._id}/${safeName}`;
  const uploaded = await s3.upload({
    Bucket: S3_BUCKET,
    Key: key,
    Body: fs.createReadStream(filePath),
    ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }).promise();
  return { almacenado: true, key, url: uploaded.Location };
}

async function obtenerArchivoOriginal(importacionId) {
  const importacion = await TasaImportacion.findById(importacionId)
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
}

async function ejecutarAnalisisArchivo({ importacionId, filePath, tipoTasa }) {
  try {
    await actualizarProgreso(importacionId, "analizando", 0, 0, "Validando columnas, períodos y registros.");
    const result = await analizarArchivo(filePath, { tipoTasa });
    await TasaImportacion.updateOne(
      { _id: importacionId },
      {
        $set: {
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
          progresoPublicacion: {
            etapa: "analisis_completado",
            procesadas: result.cantidadEntradas,
            total: result.cantidadEntradas,
            porcentaje: 100,
            mensaje: "El análisis se completó correctamente.",
            error: "",
            actualizadoAt: new Date(),
          },
        },
      }
    );
  } catch (error) {
    await TasaImportacion.updateOne(
      { _id: importacionId },
      {
        $set: {
          estado: "fallida",
          "progresoPublicacion.etapa": "fallida",
          "progresoPublicacion.error": error.message,
          "progresoPublicacion.mensaje": "El análisis no pudo completarse.",
          "progresoPublicacion.actualizadoAt": new Date(),
        },
      }
    );
    console.error(`Error al analizar importación ${importacionId}:`, error);
  } finally {
    await fs.promises.unlink(filePath).catch(() => {});
  }
}

async function iniciarAnalisis({ filePath, fileHash, fileSize, fileName, tipoTasa = "AUTOMOTORES", user }) {
  TasaCatalogo.requerir(tipoTasa, { importable: true });
  for (let intento = 0; intento < 10; intento += 1) {
    const nombreArchivo = await nombreArchivoDisponible(fileName, tipoTasa);
    try {
      const importacion = await TasaImportacion.create({
        tipoTasa,
        nombreArchivo,
        nombreArchivoClave: claveNombreArchivo(nombreArchivo),
        tamanoBytes: fileSize,
        hashArchivo: fileHash,
        formato: "desconocido",
        estado: "analizando",
        periodos: [],
        periodosActivos: [],
        subidoPor: { id: user._id, username: user.username },
        progresoPublicacion: {
          etapa: "en_cola",
          procesadas: 0,
          total: 0,
          porcentaje: 5,
          mensaje: "El archivo fue recibido y el análisis comenzará en instantes.",
          error: "",
          actualizadoAt: new Date(),
        },
      });
      setImmediate(() => ejecutarAnalisisArchivo({ importacionId: importacion._id, filePath, tipoTasa }));
      return importacion;
    } catch (error) {
      if (error.code !== 11000 || intento === 9) throw error;
    }
  }
  throw new Error("No se pudo asignar un nombre único al archivo.");
}

async function actualizarProgreso(importacionId, etapa, procesadas, total, mensaje, error = "") {
  const porcentaje = total ? Math.min(99, Math.round((procesadas / total) * 90)) : 0;
  await TasaImportacion.updateOne(
    { _id: importacionId },
    {
      $set: {
        progresoPublicacion: {
          etapa,
          procesadas,
          total,
          porcentaje,
          mensaje,
          error,
          actualizadoAt: new Date(),
        },
      },
    }
  );
}

async function insertarBoletasPorLotes(filePath, importacion) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  const detected = worksheet && detectarFormato(worksheet);
  if (!detected) throw new Error("No se pudo reconocer el formato del archivo durante la publicación.");

  const batchSize = 1000;
  let batch = [];
  let procesadas = 0;
  const lastRow = worksheet.actualRowCount || worksheet.rowCount;
  await TasaBoleta.deleteMany({ importacionId: importacion._id, activa: false });

  async function guardarLote(boletas) {
    const mensajes = new Map();
    const objetos = new Map();
    for (const boleta of boletas) {
      const datos = boleta._datosObjeto;
      const mensaje = datos.mensajeBoleta || "";
      const hash = crypto.createHash("sha256").update(mensaje).digest("hex");
      mensajes.set(hash, mensaje);
      objetos.set(boleta.objetoClave, { ...datos, mensajeHash: hash });
    }
    if (mensajes.size) {
      await TasaMensaje.bulkWrite(Array.from(mensajes, ([hash, mensaje]) => ({
        updateOne: { filter: { hash }, update: { $setOnInsert: { hash, texto: mensaje } }, upsert: true },
      })), { ordered: false });
    }
    const mensajesGuardados = await TasaMensaje.find({ hash: { $in: Array.from(mensajes.keys()) } }).select("_id hash").lean();
    const mensajeIds = new Map(mensajesGuardados.map((item) => [item.hash, item._id]));
    await TasaObjeto.bulkWrite(Array.from(objetos, ([objetoClave, datos]) => ({
      updateOne: {
        filter: { importacionId: importacion._id, objetoClave },
        update: {
          $set: {
            tipoTasa: importacion.tipoTasa,
            contribuyente: datos.contribuyente,
            objeto: datos.objeto,
            mensajeDeuda: datos.mensajeDeuda,
            mensajeBoletaId: mensajeIds.get(datos.mensajeHash),
            codigosPago: datos.codigosPago,
          },
        },
        upsert: true,
      },
    })), { ordered: false });
    const objetosGuardados = await TasaObjeto.find({
      importacionId: importacion._id,
      objetoClave: { $in: Array.from(objetos.keys()) },
    }).select("_id objetoClave").lean();
    const objetoIds = new Map(objetosGuardados.map((item) => [item.objetoClave, item._id]));
    boletas.forEach((boleta) => {
      boleta.objetoId = objetoIds.get(boleta.objetoClave);
      delete boleta._datosObjeto;
    });
    await TasaBoleta.insertMany(boletas, { ordered: true });
  }

  for (let rowNumber = detected.headerRow + 1; rowNumber <= lastRow; rowNumber += 1) {
    const raw = filaComoObjeto(worksheet.getRow(rowNumber), detected.headers);
    if (!Object.values(raw).some((value) => texto(value))) continue;
    const boleta = detected.formato === "urbana"
      ? construirBoletaUrbana(raw, importacion._id)
      : construirBoleta(normalizarFila(raw, detected.formato), importacion._id, importacion.tipoTasa);
    batch.push(boleta);
    procesadas += 1;

    if (batch.length >= batchSize) {
      await guardarLote(batch);
      batch = [];
      await actualizarProgreso(
        importacion._id,
        "guardando",
        procesadas,
        importacion.cantidadEntradas,
        `Guardando boletas por lotes (${procesadas.toLocaleString("es-AR")} de ${importacion.cantidadEntradas.toLocaleString("es-AR")}).`
      );
    }
  }
  if (batch.length) await guardarLote(batch);
  return procesadas;
}

async function ejecutarPublicacionArchivo({ importacionId, filePath, guardarOriginal, user }) {
  const importacion = await TasaImportacion.findById(importacionId);
  if (!importacion) return;
  const session = await mongoose.startSession();
  try {
    await actualizarProgreso(importacion._id, "preparando", 0, importacion.cantidadEntradas, "Preparando la publicación por lotes.");
    const insertadas = await insertarBoletasPorLotes(filePath, importacion);
    if (insertadas !== importacion.cantidadEntradas) {
      throw new Error(`Se esperaban ${importacion.cantidadEntradas} boletas, pero se prepararon ${insertadas}.`);
    }

    await actualizarProgreso(importacion._id, "activando", insertadas, insertadas, "Activando períodos y reemplazando versiones anteriores.");
    await session.withTransaction(async () => {
      await TasaBoleta.updateMany(
        { tipoTasa: importacion.tipoTasa, activa: true, importacionId: { $ne: importacion._id } },
        { $set: { activa: false } },
        { session }
      );
      await TasaBoleta.updateMany({ importacionId: importacion._id }, { $set: { activa: true } }, { session });

      const anteriores = await TasaImportacion.find({
        _id: { $ne: importacion._id },
        tipoTasa: importacion.tipoTasa,
        estado: { $in: ["publicada", "reemplazada_parcialmente"] },
        periodosActivos: { $in: importacion.periodos },
      }).session(session);
      for (const anterior of anteriores) {
        anterior.periodosActivos = anterior.periodosActivos.filter((periodo) => !importacion.periodos.includes(periodo));
        anterior.estado = anterior.periodosActivos.length ? "reemplazada_parcialmente" : "reemplazada";
        await anterior.save({ session });
      }

      importacion.estado = "publicada";
      importacion.periodosActivos = importacion.periodos;
      importacion.publicadoPor = { id: user._id, username: user.username };
      importacion.publicadoAt = new Date();
      importacion.progresoPublicacion = {
        etapa: "completada",
        procesadas: insertadas,
        total: insertadas,
        porcentaje: 100,
        mensaje: "La publicación se completó correctamente.",
        error: "",
        actualizadoAt: new Date(),
      };
      await importacion.save({ session });
    });

    if (guardarOriginal && await guardarOriginalHabilitado(importacion.tipoTasa)) {
      try {
        importacion.archivoOriginal = await subirOriginalArchivo(filePath, importacion, importacion.nombreArchivo);
        await importacion.save();
      } catch (error) {
        importacion.progresoPublicacion.mensaje = `Publicación completada. No se pudo almacenar el archivo original: ${error.message}`;
        await importacion.save();
      }
    }
  } catch (error) {
    await TasaBoleta.deleteMany({ importacionId: importacion._id, activa: false }).catch(() => {});
    await TasaObjeto.deleteMany({ importacionId: importacion._id }).catch(() => {});
    const mensajesUsados = await TasaObjeto.distinct("mensajeBoletaId").catch(() => []);
    await TasaMensaje.deleteMany({ _id: { $nin: mensajesUsados } }).catch(() => {});
    await TasaImportacion.updateOne(
      { _id: importacion._id, estado: "publicando" },
      {
        $set: {
          estado: "fallida",
          "progresoPublicacion.etapa": "fallida",
          "progresoPublicacion.error": error.message,
          "progresoPublicacion.mensaje": "La publicación no pudo completarse.",
          "progresoPublicacion.actualizadoAt": new Date(),
        },
      }
    );
    console.error(`Error al publicar importación ${importacion._id}:`, error);
  } finally {
    await session.endSession();
    await fs.promises.unlink(filePath).catch(() => {});
  }
}

async function iniciarPublicacion({ importacionId, filePath, fileHash, confirmarReemplazo, confirmarPeriodosFuturos, guardarOriginal, user }) {
  const importacion = await TasaImportacion.findById(importacionId);
  if (!importacion) throw Object.assign(new Error("Intento de importación no encontrado."), { status: 404 });
  if (!["analizada", "fallida"].includes(importacion.estado)) {
    throw Object.assign(new Error("La importación ya no puede publicarse."), { status: 409 });
  }
  if (fileHash !== importacion.hashArchivo) {
    throw Object.assign(new Error("El archivo no coincide con el archivo analizado."), { status: 409 });
  }

  const anioActual = new Date().getFullYear();
  const periodosFuturos = importacion.periodos.filter((periodo) => Number(periodo.split("/")[1]) > anioActual);
  if (periodosFuturos.length && !confirmarPeriodosFuturos) {
    throw Object.assign(new Error(`La carga contiene períodos posteriores al año actual (${anioActual}). Confirmá expresamente para continuar.`), { status: 409, periodosFuturos });
  }
  const conflictos = await periodosActivosExistentes(importacion.tipoTasa, importacion.periodos);
  if (conflictos.length && !confirmarReemplazo) {
    throw Object.assign(new Error("Existen períodos publicados que serán reemplazados."), { status: 409, conflictos });
  }

  importacion.estado = "publicando";
  importacion.progresoPublicacion = {
    etapa: "en_cola",
    procesadas: 0,
    total: importacion.cantidadEntradas,
    porcentaje: 0,
    mensaje: "El archivo fue recibido y la publicación comenzará en instantes.",
    error: "",
    actualizadoAt: new Date(),
  };
  await importacion.save();

  setImmediate(() => ejecutarPublicacionArchivo({
    importacionId: importacion._id,
    filePath,
    guardarOriginal,
    user: { _id: user._id, username: user.username },
  }));
  return importacion;
}

async function listarPeriodosCargados(tipoTasa = "AUTOMOTORES") {
  TasaCatalogo.requerir(tipoTasa);
  return TasaBoleta.aggregate([
    { $match: { tipoTasa } },
    {
      $group: {
        _id: { importacionId: "$importacionId", anio: "$anio", cuota: "$cuota" },
        cantidadEntradas: { $sum: 1 },
        cantidadActivas: { $sum: { $cond: ["$activa", 1, 0] } },
      },
    },
    {
      $lookup: {
        from: TasaImportacion.collection.name,
        localField: "_id.importacionId",
        foreignField: "_id",
        as: "importacion",
      },
    },
    { $unwind: "$importacion" },
    {
      $project: {
        _id: 0,
        importacionId: "$_id.importacionId",
        periodo: {
          $concat: [
            { $cond: [{ $lt: ["$_id.cuota", 10] }, "0", ""] },
            { $toString: "$_id.cuota" },
            "/",
            { $toString: "$_id.anio" },
          ],
        },
        anio: "$_id.anio",
        cuota: "$_id.cuota",
        cantidadEntradas: 1,
        habilitado: { $eq: ["$cantidadActivas", "$cantidadEntradas"] },
        actualizadoAt: "$importacion.updatedAt",
        nombreArchivo: "$importacion.nombreArchivo",
        estadoImportacion: "$importacion.estado",
        publicadoAt: "$importacion.publicadoAt",
        publicadoPor: "$importacion.publicadoPor.username",
      },
    },
    { $sort: { anio: -1, cuota: 1, habilitado: -1, publicadoAt: -1 } },
  ]);
}

async function cambiarEstadoPeriodo({ importacionId, periodo, habilitar, confirmarReemplazo }) {
  const importacion = await TasaImportacion.findById(importacionId);
  if (!importacion || !importacion.periodos.includes(periodo)) {
    throw Object.assign(new Error("La carga seleccionada no contiene ese período."), { status: 404 });
  }
  if (importacion.estado === "deshabilitada") {
    throw Object.assign(new Error("La carga está deshabilitada y sus períodos no pueden volver a habilitarse."), { status: 409 });
  }

  const partes = periodoPartes(periodo);
  const objetivo = await TasaBoleta.countDocuments({ importacionId, ...partes });
  if (!objetivo) {
    throw Object.assign(new Error("No hay boletas almacenadas para ese período."), { status: 404 });
  }

  const conflictos = habilitar
    ? await TasaImportacion.find({
      _id: { $ne: importacion._id },
      tipoTasa: importacion.tipoTasa,
      periodosActivos: periodo,
    }).select("_id nombreArchivo publicadoAt")
    : [];
  if (conflictos.length && !confirmarReemplazo) {
    const error = new Error("Habilitar este período desactivará otra carga actualmente habilitada.");
    error.status = 409;
    error.conflictos = conflictos.map((item) => ({
      importacionId: item._id,
      nombreArchivo: item.nombreArchivo,
      publicadoAt: item.publicadoAt,
    }));
    throw error;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (habilitar) {
        await TasaBoleta.updateMany(
          { tipoTasa: importacion.tipoTasa, ...partes, activa: true, importacionId: { $ne: importacion._id } },
          { $set: { activa: false } },
          { session }
        );
        await TasaBoleta.updateMany(
          { importacionId: importacion._id, ...partes },
          { $set: { activa: true } },
          { session }
        );

        const anteriores = await TasaImportacion.find({
          _id: { $ne: importacion._id },
          tipoTasa: importacion.tipoTasa,
          periodosActivos: periodo,
        }).session(session);
        for (const anterior of anteriores) {
          anterior.periodosActivos = anterior.periodosActivos.filter((item) => item !== periodo);
          anterior.estado = anterior.periodosActivos.length ? "reemplazada_parcialmente" : "reemplazada";
          await anterior.save({ session });
        }
        if (!importacion.periodosActivos.includes(periodo)) importacion.periodosActivos.push(periodo);
        importacion.estado = importacion.periodosActivos.length === importacion.periodos.length
          ? "publicada"
          : "reemplazada_parcialmente";
      } else {
        await TasaBoleta.updateMany(
          { importacionId: importacion._id, ...partes },
          { $set: { activa: false } },
          { session }
        );
        importacion.periodosActivos = importacion.periodosActivos.filter((item) => item !== periodo);
        importacion.estado = importacion.periodosActivos.length ? "reemplazada_parcialmente" : "reemplazada";
      }
      await importacion.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return {
    periodo,
    habilitado: Boolean(habilitar),
    cantidadEntradas: objetivo,
    desactivadas: conflictos.map((item) => ({
      importacionId: item._id,
      nombreArchivo: item.nombreArchivo,
      publicadoAt: item.publicadoAt,
    })),
  };
}

async function deshabilitarImportacion(importacionId) {
  const importacion = await TasaImportacion.findById(importacionId);
  if (!importacion) {
    throw Object.assign(new Error("La carga seleccionada no existe."), { status: 404 });
  }
  if (importacion.estado === "deshabilitada") {
    throw Object.assign(new Error("La carga ya se encuentra deshabilitada."), { status: 409 });
  }

  const session = await mongoose.startSession();
  let boletasDeshabilitadas = 0;
  try {
    await session.withTransaction(async () => {
      const update = await TasaBoleta.updateMany(
        { importacionId: importacion._id, activa: true },
        { $set: { activa: false } },
        { session }
      );
      boletasDeshabilitadas = update.modifiedCount || update.nModified || 0;
      importacion.periodosActivos = [];
      importacion.estado = "deshabilitada";
      await importacion.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return {
    importacionId: importacion._id,
    estado: importacion.estado,
    boletasDeshabilitadas,
  };
}

async function actualizarConfiguracionGuardarOriginal(value, tipoTasa = "AUTOMOTORES") {
  const tasa = TasaCatalogo.requerir(tipoTasa);
  return Config.findOneAndUpdate(
    { key: `guardarArchivoOriginalTasas:${tasa.codigo}` },
    {
        value: value === true,
      description: `Permite almacenar en S3 el archivo original de importaciones de ${tasa.nombre}.`,
    },
    { new: true, upsert: true }
  );
}

module.exports = {
  analizarBuffer,
  analizarArchivo,
  nombreArchivoDisponible,
  obtenerArchivoOriginal,
  iniciarAnalisis,
  iniciarPublicacion,
  listarPeriodosCargados,
  cambiarEstadoPeriodo,
  deshabilitarImportacion,
  guardarOriginalHabilitado,
  actualizarConfiguracionGuardarOriginal,
};
