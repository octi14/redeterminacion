const ProvinciaNetService = require("../services/provinciaNet.service");
const DeudaPagoService = require("../services/deudaPago.service");
const TasaUrbanaImportacionService = require("../services/tasaUrbanaImportacion.service");
const TasaUrbanaImportacion = require("../models/tasaUrbanaImportacion.model");
const User = require("../models/user.model");
const fs = require("fs");

const PRIVILEGED_ROLES = ["admin", "master", "true", "boletas", "hacienda"];

async function usuarioPrivilegiado(req) {
  if (!req.auth || !req.auth.sub) return false;
  const user = await User.findById(req.auth.sub).select("admin").lean();
  const role = String((user && user.admin) || "")
    .trim()
    .toLowerCase();
  return PRIVILEGED_ROLES.includes(role);
}

async function puedeAccederPagoUrbana(req) {
  if (await usuarioPrivilegiado(req)) return true;
  return DeudaPagoService.pagoTasaUrbanaPublicoHabilitado();
}

function fileName(req) {
  const raw = req.headers["x-file-name"] || "urbana.xlsx";
  try {
    return decodeURIComponent(raw);
  } catch (_) {
    return raw;
  }
}

async function actualizarProgreso(importId, progreso) {
  await TasaUrbanaImportacion.updateOne(
    { _id: importId },
    {
      $set: {
        progreso: {
          etapa: progreso.etapa || "",
          procesadas: progreso.procesadas || 0,
          total: progreso.total || 0,
          porcentaje: progreso.porcentaje || 0,
          mensaje: progreso.mensaje || "",
          error: progreso.error || "",
          actualizadoAt: new Date(),
        },
        ...(progreso.importBatchId
          ? { importBatchId: progreso.importBatchId }
          : {}),
      },
    }
  );
}

exports.configuracion = async function configuracion(_req, res) {
  try {
    const [habilitada, guardarArchivoOriginalTasas] = await Promise.all([
      DeudaPagoService.pagoTasaUrbanaPublicoHabilitado(),
      TasaUrbanaImportacionService.guardarOriginalHabilitado(),
    ]);
    return res.status(200).json({ data: { habilitada, guardarArchivoOriginalTasas } });
  } catch (e) {
    console.error("provinciaNet.configuracion:", e.message);
    return res
      .status(500)
      .json({ message: "No se pudo consultar la configuración de pago urbana." });
  }
};

exports.actualizarConfiguracion = async function actualizarConfiguracion(req, res) {
  try {
    if (!(await usuarioPrivilegiado(req))) {
      return res.status(403).json({ message: "No tenés permisos para esta acción." });
    }
    const data = {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "pagoTasaUrbanaPublico")) {
      if (typeof req.body.pagoTasaUrbanaPublico !== "boolean") {
        return res
          .status(400)
          .json({ message: "Enviá pagoTasaUrbanaPublico como boolean." });
      }
      const updated = await DeudaPagoService.actualizarPagoTasaUrbanaPublico(
        req.body.pagoTasaUrbanaPublico
      );
      data.pagoTasaUrbanaPublico = {
        key: updated.key,
        value: updated.value === true,
      };
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "guardarArchivoOriginalTasas")) {
      if (typeof req.body.guardarArchivoOriginalTasas !== "boolean") {
        return res
          .status(400)
          .json({ message: "Enviá guardarArchivoOriginalTasas como boolean." });
      }
      const updated = await TasaUrbanaImportacionService.actualizarConfiguracionGuardarOriginal(
        req.body.guardarArchivoOriginalTasas
      );
      data.guardarArchivoOriginalTasas = {
        key: updated.key,
        value: updated.value === true,
      };
    }
    if (!Object.keys(data).length) {
      return res.status(400).json({ message: "No se envió ninguna configuración válida." });
    }
    return res.status(200).json({ data });
  } catch (e) {
    console.error("provinciaNet.actualizarConfiguracion:", e.message);
    return res
      .status(e.status || 500)
      .json({ message: e.message || "No se pudo actualizar la configuración." });
  }
};

exports.importarUrbana = async function importarUrbana(req, res) {
  const archivo = req.archivoTemporal || null;
  if (!archivo) {
    return res.status(400).json({ message: "Debe enviar un archivo XLSX." });
  }

  const nombre = fileName(req);
  const user = req.authenticatedUser;
  const importacion = await TasaUrbanaImportacion.create({
    nombreArchivo: nombre,
    tamanoBytes: archivo.size || 0,
    hashArchivo: archivo.hash || undefined,
    estado: "procesando",
    subidoPor: user
      ? { id: user._id, username: user.username }
      : undefined,
    progreso: {
      etapa: "en_cola",
      procesadas: 0,
      total: 0,
      porcentaje: 5,
      mensaje: "El archivo fue recibido y la importación comenzará en instantes.",
      error: "",
      actualizadoAt: new Date(),
    },
  });

  res.status(202).json({
    data: {
      importId: String(importacion._id),
      estado: "procesando",
      fileName: nombre,
    },
  });

  setImmediate(async () => {
    try {
      let lastProgressAt = 0;
      const data = await TasaUrbanaImportacionService.importarArchivo({
        filePath: archivo.path,
        fileName: nombre,
        onProgress: async (progreso) => {
          const now = Date.now();
          if (now - lastProgressAt < 1200 && progreso.etapa === "importando") return;
          lastProgressAt = now;
          await actualizarProgreso(importacion._id, progreso);
        },
      });

      let archivoOriginal;
      try {
        if (await TasaUrbanaImportacionService.guardarOriginalHabilitado()) {
          archivoOriginal = await TasaUrbanaImportacionService.subirOriginalArchivo(
            archivo.path,
            importacion,
            nombre
          );
        }
      } catch (s3Error) {
        console.error("provinciaNet.importarUrbana S3:", s3Error.message);
      }
      await TasaUrbanaImportacion.updateOne(
        { _id: importacion._id },
        {
          $set: {
            estado: "completada",
            formato: data.formato,
            periodos: data.periodos || [],
            calendarioPeriodos: data.calendarioPeriodos || [],
            cantidadEntradas: data.cantidadEntradas || 0,
            cantidadObjetos: data.cantidadObjetos || 0,
            cantidadImportadas: data.cantidadImportadas || 0,
            cantidadDesactivadas: data.cantidadDesactivadas || 0,
            cantidadErrores: data.cantidadErrores || 0,
            cantidadAdvertencias: data.cantidadAdvertencias || 0,
            observaciones: data.observaciones || [],
            importBatchId: data.importBatchId,
            ...(archivoOriginal ? { archivoOriginal } : {}),
            progreso: {
              etapa: "completada",
              procesadas: data.cantidadImportadas || 0,
              total: data.cantidadImportadas || 0,
              porcentaje: 100,
              mensaje: "Importación completada.",
              error: "",
              actualizadoAt: new Date(),
            },
          },
        }
      );
    } catch (e) {
      console.error("provinciaNet.importarUrbana:", e.message);
      const analisis = e.analisis || {};
      await TasaUrbanaImportacion.updateOne(
        { _id: importacion._id },
        {
          $set: {
            estado: "fallida",
            formato: analisis.formato,
            periodos: analisis.periodos || [],
            cantidadEntradas: analisis.cantidadEntradas || 0,
            cantidadObjetos: analisis.cantidadObjetos || 0,
            cantidadImportadas: 0,
            cantidadErrores: analisis.cantidadErrores || 0,
            cantidadAdvertencias: analisis.cantidadAdvertencias || 0,
            observaciones: analisis.observaciones || [],
            importBatchId: analisis.importBatchId,
            progreso: {
              etapa: "fallida",
              porcentaje: 100,
              mensaje: "La importación no pudo completarse.",
              error: e.message || "Error desconocido",
              actualizadoAt: new Date(),
            },
          },
        }
      );
    } finally {
      await fs.promises.unlink(archivo.path).catch(() => {});
    }
  });
};

exports.archivoOriginalUrbana = async function archivoOriginalUrbana(req, res) {
  try {
    const original = await TasaUrbanaImportacionService.obtenerArchivoOriginal(req.params.importId);
    res.setHeader("Content-Type", original.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(original.nombreArchivo)}`
    );
    return res.send(original.body);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

exports.progresoImportUrbana = async function progresoImportUrbana(req, res) {
  try {
    const job = await TasaUrbanaImportacionService.obtenerProgreso(req.params.importId);
    if (!job) {
      return res.status(404).json({ message: "Importación no encontrada." });
    }
    const resultado =
      job.estado === "completada" || job.estado === "fallida"
        ? {
            fileName: job.nombreArchivo,
            formato: job.formato,
            cantidadEntradas: job.cantidadEntradas,
            cantidadObjetos: job.cantidadObjetos,
            cantidadImportadas: job.cantidadImportadas,
            cantidadDesactivadas: job.cantidadDesactivadas,
            cantidadErrores: job.cantidadErrores,
            cantidadAdvertencias: job.cantidadAdvertencias,
            periodos: job.periodos,
            observaciones: job.observaciones,
          }
        : undefined;
    return res.status(200).json({
      data: {
        importId: String(job._id),
        estado: job.estado,
        fileName: job.nombreArchivo,
        progreso: job.progreso,
        resultado,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.listarImportacionesUrbana = async function listarImportacionesUrbana(_req, res) {
  try {
    const data = await TasaUrbanaImportacionService.listarHistorial();
    return res.status(200).json({ data });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.listarPeriodosUrbana = async function listarPeriodosUrbana(_req, res) {
  try {
    const data = await TasaUrbanaImportacionService.listarPeriodosCargados();
    return res.status(200).json({ data });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.cambiarEstadoPeriodoUrbana = async function cambiarEstadoPeriodoUrbana(req, res) {
  try {
    const data = await TasaUrbanaImportacionService.cambiarEstadoPeriodo({
      importBatchId: req.body?.importBatchId || req.params.importBatchId,
      anio: req.body?.anio,
      cuota: req.body?.cuota,
      habilitar: req.body?.habilitar === true,
    });
    return res.status(200).json({ data });
  } catch (e) {
    return res.status(e.status || 500).json({ message: e.message });
  }
};

exports.getDeuda = async function getDeuda(req, res) {
  try {
    if (!(await puedeAccederPagoUrbana(req))) {
      return res.status(403).json({ message: "El pago de tasa urbana no está disponible." });
    }

    const tipoTasa = req.query.tipoTasa || "URBANA";
    const objetoClave = req.query.objetoClave || req.query.partida || req.query.dominio;
    if (!objetoClave) {
      return res.status(400).json({ message: "Falta objetoClave (partida o dominio)." });
    }

    const deuda = await DeudaPagoService.resolverDeuda({ tipoTasa, objetoClave });
    const { _paymentItems, ...data } = deuda;
    return res.status(200).json({ data });
  } catch (e) {
    console.error("provinciaNet.getDeuda:", e.message);
    return res.status(e.status || 500).json({
      message: e.message || "No se pudo consultar la deuda.",
      code: e.code || undefined,
    });
  }
};

exports.createPreorder = async function createPreorder(req, res) {
  try {
    if (!(await puedeAccederPagoUrbana(req))) {
      return res.status(403).json({ message: "El pago de tasa urbana no está disponible." });
    }

    const {
      payer,
      payments,
      objetoClave,
      tipoTasa,
      itemIds,
      periodos,
    } = req.body || {};

    if (!payer) {
      return res.status(400).json({ message: "Falta payer en el body." });
    }

    const data = await ProvinciaNetService.createPreorder({
      payer,
      payments,
      objetoClave,
      tipoTasa,
      itemIds,
      periodos,
    });

    return res.status(201).json({ data });
  } catch (e) {
    console.error("provinciaNet.createPreorder:", e.message, e.data || "");
    return res.status(e.status || 500).json({
      message: e.message || "Error al crear intención de pago",
      data: e.data,
    });
  }
};

exports.getEstado = async function getEstado(req, res) {
  try {
    const { uuid } = req.params;
    if (!uuid) {
      return res.status(400).json({ message: "Falta uuid" });
    }
    const data = await ProvinciaNetService.getEstado(uuid);
    return res.status(200).json({ data });
  } catch (e) {
    console.error("provinciaNet.getEstado:", e.message);
    return res.status(e.status || 500).json({
      message: e.message || "Error al consultar estado",
      data: e.data,
    });
  }
};

exports.webhook = async function webhook(req, res) {
  try {
    const data = await ProvinciaNetService.applyWebhookPayload(req.body);
    return res.status(200).json({ message: "OK", data: { uuid: data.uuid, status: data.status } });
  } catch (e) {
    console.error("provinciaNet.webhook:", e.message);
    return res.status(e.status || 500).json({
      message: e.message || "Error procesando webhook",
    });
  }
};
