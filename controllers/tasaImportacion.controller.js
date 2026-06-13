const TasaImportacion = require("../models/tasaImportacion.model");
const TasaImportacionService = require("../services/tasaImportacion.service");

function fileName(req) {
  const raw = req.headers["x-file-name"] || "automotores.xlsx";
  try {
    return decodeURIComponent(raw);
  } catch (_) {
    return raw;
  }
}

function requireBuffer(req) {
  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    const error = new Error("Debe enviar un archivo XLSX.");
    error.status = 400;
    throw error;
  }
  return req.body;
}

exports.analizar = async function (req, res) {
  try {
    const importacion = await TasaImportacionService.crearIntento({
      buffer: requireBuffer(req),
      fileName: fileName(req),
      user: req.authenticatedUser,
    });
    return res.status(201).json({ data: importacion });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

exports.publicar = async function (req, res) {
  try {
    const result = await TasaImportacionService.publicar({
      importacionId: req.params.id,
      buffer: requireBuffer(req),
      confirmarReemplazo: req.headers["x-confirmar-reemplazo"] === "true",
      guardarOriginal: req.headers["x-guardar-original"] === "true",
      user: req.authenticatedUser,
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message,
      conflictos: error.conflictos || [],
      resultado: error.result,
    });
  }
};

exports.listar = async function (_req, res) {
  try {
    const imports = await TasaImportacion.find()
      .select("-observaciones")
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json({ data: imports });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.obtener = async function (req, res) {
  try {
    const importacion = await TasaImportacion.findById(req.params.id);
    if (!importacion) return res.status(404).json({ message: "Importación no encontrada." });
    return res.status(200).json({ data: importacion });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.reporte = async function (req, res) {
  try {
    const importacion = await TasaImportacion.findById(req.params.id);
    if (!importacion) return res.status(404).json({ message: "Importación no encontrada." });
    const lines = [
      "REPORTE DE VALIDACIÓN DE BOLETAS DE AUTOMOTORES",
      `Archivo: ${importacion.nombreArchivo}`,
      `Fecha: ${importacion.createdAt.toISOString()}`,
      `Entradas: ${importacion.cantidadEntradas}`,
      `Dominios: ${importacion.cantidadObjetos}`,
      `Períodos: ${importacion.periodos.join(", ")}`,
      `Errores: ${importacion.cantidadErrores}`,
      `Advertencias: ${importacion.cantidadAdvertencias}`,
      `Observaciones omitidas: ${importacion.observacionesOmitidas}`,
      "",
      "DETALLE",
      ...importacion.observaciones.map((item) =>
        `[${item.tipo.toUpperCase()}] Fila ${item.fila || "-"} | ${item.columna} | ${item.mensaje}`
      ),
    ];
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-${importacion._id}.txt"`);
    return res.send(lines.join("\r\n"));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.obtenerConfiguracion = async function (_req, res) {
  try {
    const enabled = await TasaImportacionService.guardarOriginalHabilitado();
    return res.status(200).json({ data: { guardarArchivoOriginalTasas: enabled } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.actualizarConfiguracion = async function (req, res) {
  try {
    const config = await TasaImportacionService.actualizarConfiguracionGuardarOriginal(
      req.body.guardarArchivoOriginalTasas
    );
    return res.status(200).json({ data: config });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
