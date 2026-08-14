const ProvinciaNetService = require("../services/provinciaNet.service");
const DeudaPagoService = require("../services/deudaPago.service");
const TasaUrbanaImportacionService = require("../services/tasaUrbanaImportacion.service");
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

async function rolUsuario(req) {
  if (!req.auth || !req.auth.sub) return "";
  const user = await User.findById(req.auth.sub).select("admin").lean();
  return String((user && user.admin) || "")
    .trim()
    .toLowerCase();
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

exports.configuracion = async function configuracion(_req, res) {
  try {
    const habilitada = await DeudaPagoService.pagoTasaUrbanaPublicoHabilitado();
    return res.status(200).json({ data: { habilitada } });
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
    if (typeof req.body?.pagoTasaUrbanaPublico !== "boolean") {
      return res
        .status(400)
        .json({ message: "Enviá pagoTasaUrbanaPublico como boolean." });
    }
    const updated = await DeudaPagoService.actualizarPagoTasaUrbanaPublico(
      req.body.pagoTasaUrbanaPublico
    );
    return res.status(200).json({
      data: {
        pagoTasaUrbanaPublico: {
          key: updated.key,
          value: updated.value === true,
        },
      },
    });
  } catch (e) {
    console.error("provinciaNet.actualizarConfiguracion:", e.message);
    return res
      .status(e.status || 500)
      .json({ message: e.message || "No se pudo actualizar la configuración." });
  }
};

exports.importarUrbana = async function importarUrbana(req, res) {
  let archivo = req.archivoTemporal || null;
  try {
    if (!archivo) {
      return res.status(400).json({ message: "Debe enviar un archivo XLSX." });
    }
    const data = await TasaUrbanaImportacionService.importarArchivo({
      filePath: archivo.path,
      fileName: fileName(req),
    });
    archivo = null;
    return res.status(200).json({ data });
  } catch (e) {
    console.error("provinciaNet.importarUrbana:", e.message);
    if (e.analisis) {
      console.error(
        "Detalle import urbana:",
        `entradas=${e.analisis.cantidadEntradas}`,
        `errores=${e.analisis.cantidadErrores}`,
        `formato=${e.analisis.formato}`,
        e.analisis.observaciones?.slice(0, 5)
      );
    }
    return res.status(e.status || 500).json({
      message: e.message || "No se pudo importar el archivo de tasa urbana.",
      data: e.analisis || undefined,
    });
  } finally {
    if (archivo) await fs.promises.unlink(archivo.path).catch(() => {});
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
      useHomologacionFixture,
    } = req.body || {};

    if (!payer) {
      return res.status(400).json({ message: "Falta payer en el body." });
    }

    let fixturePermitido = false;
    if (useHomologacionFixture === true) {
      const rol = await rolUsuario(req);
      if (rol !== "master") {
        return res.status(403).json({
          message: "El pago de prueba solo está disponible para usuarios master.",
        });
      }
      fixturePermitido = true;
    }

    const data = await ProvinciaNetService.createPreorder({
      payer,
      payments,
      objetoClave,
      tipoTasa,
      itemIds,
      periodos,
      useHomologacionFixture: fixturePermitido,
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
