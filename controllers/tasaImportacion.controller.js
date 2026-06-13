const TasaImportacion = require("../models/tasaImportacion.model");
const TasaImportacionService = require("../services/tasaImportacion.service");
const TasaCatalogo = require("../services/tasaCatalogo.service");
const fs = require("fs");

function tipoTasa(req) {
  return String(req.query.tipoTasa || req.headers["x-tipo-tasa"] || "AUTOMOTORES").toUpperCase();
}

function fileName(req) {
  const raw = req.headers["x-file-name"] || "automotores.xlsx";
  try {
    return decodeURIComponent(raw);
  } catch (_) {
    return raw;
  }
}

function requireArchivo(req) {
  if (!req.archivoTemporal) throw Object.assign(new Error("Debe enviar un archivo XLSX."), { status: 400 });
  return req.archivoTemporal;
}

exports.analizar = async function (req, res) {
  let archivo;
  try {
    archivo = requireArchivo(req);
    const importacion = await TasaImportacionService.iniciarAnalisis({
      filePath: archivo.path,
      fileHash: archivo.hash,
      fileSize: archivo.size,
      fileName: fileName(req),
      tipoTasa: tipoTasa(req),
      user: req.authenticatedUser,
    });
    archivo = null;
    return res.status(202).json({ data: importacion });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  } finally {
    if (archivo) await fs.promises.unlink(archivo.path).catch(() => {});
  }
};

exports.publicar = async function (req, res) {
  let archivo;
  try {
    archivo = requireArchivo(req);
    const importacion = await TasaImportacionService.iniciarPublicacion({
      importacionId: req.params.id,
      filePath: archivo.path,
      fileHash: archivo.hash,
      confirmarReemplazo: req.headers["x-confirmar-reemplazo"] === "true",
      confirmarPeriodosFuturos: req.headers["x-confirmar-periodos-futuros"] === "true",
      guardarOriginal: req.headers["x-guardar-original"] === "true",
      user: req.authenticatedUser,
    });
    archivo = null;
    return res.status(202).json({ data: importacion });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message,
      conflictos: error.conflictos || [],
      periodosFuturos: error.periodosFuturos || [],
      resultado: error.result,
    });
  } finally {
    if (archivo) await fs.promises.unlink(archivo.path).catch(() => {});
  }
};

exports.listar = async function (_req, res) {
  try {
    const tasa = TasaCatalogo.requerir(tipoTasa(_req));
    const imports = await TasaImportacion.find({ tipoTasa: tasa.codigo })
      .select("-observaciones")
      .sort({ createdAt: -1 })
      .limit(2000);
    return res.status(200).json({ data: imports });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
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

exports.progreso = async function (req, res) {
  try {
    const importacion = await TasaImportacion.findById(req.params.id)
      .select("estado progresoPublicacion")
      .lean();
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
      `REPORTE DE VALIDACIÓN DE BOLETAS DE ${importacion.tipoTasa}`,
      `Archivo: ${importacion.nombreArchivo}`,
      `Fecha: ${importacion.createdAt.toISOString()}`,
      `Entradas: ${importacion.cantidadEntradas}`,
      `${importacion.tipoTasa === "URBANA" ? "Partidas" : "Dominios"}: ${importacion.cantidadObjetos}`,
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

exports.archivoOriginal = async function (req, res) {
  try {
    const original = await TasaImportacionService.obtenerArchivoOriginal(req.params.id);
    res.setHeader("Content-Type", original.contentType);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(original.nombreArchivo)}`);
    return res.send(original.body);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

exports.obtenerConfiguracion = async function (_req, res) {
  try {
    const enabled = await TasaImportacionService.guardarOriginalHabilitado(tipoTasa(_req));
    return res.status(200).json({ data: { guardarArchivoOriginalTasas: enabled } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.actualizarConfiguracion = async function (req, res) {
  try {
    const config = await TasaImportacionService.actualizarConfiguracionGuardarOriginal(
      req.body.guardarArchivoOriginalTasas,
      tipoTasa(req)
    );
    return res.status(200).json({ data: config });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.listarPeriodos = async function (_req, res) {
  try {
    const periodos = await TasaImportacionService.listarPeriodosCargados(tipoTasa(_req));
    return res.status(200).json({ data: periodos });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

exports.listarTipos = function (_req, res) {
  return res.status(200).json({ data: TasaCatalogo.listar() });
};

exports.cambiarEstadoPeriodo = async function (req, res) {
  try {
    const result = await TasaImportacionService.cambiarEstadoPeriodo({
      importacionId: req.params.importacionId,
      periodo: req.body.periodo,
      habilitar: req.body.habilitar === true,
      confirmarReemplazo: req.body.confirmarReemplazo === true,
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message,
      conflictos: error.conflictos || [],
    });
  }
};

exports.deshabilitar = async function (req, res) {
  try {
    const result = await TasaImportacionService.deshabilitarImportacion(req.params.id);
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};
