const TasaBoleta = require("../models/tasaBoleta.model");
const TasaAutomotorPdf = require("../services/tasaAutomotorPdf.service");
const TasaBoletaDatos = require("../services/tasaBoletaDatos.service");
const TasaImportacionService = require("../services/tasaImportacion.service");
const User = require("../models/user.model");

const MAX_PERIODOS_POR_DESCARGA = 20;
const PRIVILEGED_ROLES = ["admin", "master", "true", "boletas"];

function normalizarDominio(value) {
  return String(value || "").replace(/[\s-]/g, "").toUpperCase();
}

function validarDominio(req, res) {
  const dominio = normalizarDominio(req.params.dominio);
  if (!/^[A-Z0-9]{5,9}$/.test(dominio)) {
    res.status(400).json({ message: "Ingresá un dominio válido." });
    return null;
  }
  return dominio;
}

function filtroPeriodos(periodos) {
  return { $or: periodos.map((periodo) => {
    const [cuota, anio] = periodo.split("/").map(Number);
    return { cuota, anio };
  }) };
}

async function usuarioPrivilegiado(req) {
  if (!req.user || !req.user.sub) return false;
  const user = await User.findById(req.user.sub).select("admin").lean();
  const role = String(user && user.admin || "").trim().toLowerCase();
  return PRIVILEGED_ROLES.includes(role);
}

async function puedeConsultarModulo(req) {
  if (await usuarioPrivilegiado(req)) return true;
  return TasaImportacionService.tasaAutomotorPublicaHabilitada();
}

exports.configuracion = async function configuracion(_req, res) {
  try {
    const habilitada = await TasaImportacionService.tasaAutomotorPublicaHabilitada();
    return res.status(200).json({ data: { habilitada } });
  } catch (error) {
    return res.status(500).json({ message: "No se pudo consultar la configuracion de automotores." });
  }
};

exports.buscar = async function buscar(req, res) {
  try {
    if (!(await puedeConsultarModulo(req))) {
      return res.status(403).json({ message: "La descarga de tasa automotor no se encuentra disponible." });
    }
    const dominio = validarDominio(req, res);
    if (!dominio) return;
    const boletas = await TasaBoleta.find({
      tipoTasa: "AUTOMOTORES",
      objetoClave: dominio,
      activa: true,
    })
      .select("anio cuota importeCentavos vencimientos.fecha vencimientos.importeCentavos objetoId")
      .populate("objetoId")
      .sort({ anio: 1, cuota: 1 })
      .lean();
    if (!boletas.length) return res.status(404).json({ message: "No encontramos boletas activas para ese dominio." });
    const expandidas = boletas.map(TasaBoletaDatos.expandir);
    return res.status(200).json({
      data: {
        dominio,
        vehiculo: expandidas[0].objeto,
        maxPeriodosPorDescarga: MAX_PERIODOS_POR_DESCARGA,
        periodos: expandidas.map((boleta) => ({
          periodo: TasaBoletaDatos.periodo(boleta),
          anio: boleta.anio,
          cuota: boleta.cuota,
          importeCentavos: boleta.importeCentavos,
          vencimientos: boleta.vencimientos.map((item) => ({
            orden: item.orden,
            fecha: item.fecha,
            importeCentavos: item.importeCentavos,
          })),
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "No se pudieron consultar las boletas." });
  }
};

exports.descargar = async function descargar(req, res) {
  try {
    if (!(await puedeConsultarModulo(req))) {
      return res.status(403).json({ message: "La descarga de tasa automotor no se encuentra disponible." });
    }
    const dominio = validarDominio(req, res);
    if (!dominio) return;
    const periodos = Array.isArray(req.body.periodos) ? [...new Set(req.body.periodos)] : [];
    if (!periodos.length) {
      return res.status(400).json({ message: "Seleccioná al menos un período para generar el PDF." });
    }
    if (periodos.length > MAX_PERIODOS_POR_DESCARGA) {
      return res.status(400).json({
        message: `Seleccionaste ${periodos.length} períodos. El máximo permitido por descarga es ${MAX_PERIODOS_POR_DESCARGA}.`,
      });
    }
    const boletas = await TasaBoleta.find({
      tipoTasa: "AUTOMOTORES",
      objetoClave: dominio,
      ...filtroPeriodos(periodos),
      activa: true,
    })
      .sort({ anio: 1, cuota: 1 })
      .populate({ path: "objetoId", populate: { path: "mensajeBoletaId" } })
      .lean();
    if (boletas.length !== periodos.length) {
      return res.status(404).json({ message: "Uno o más períodos seleccionados ya no están disponibles." });
    }
    const pdf = await TasaAutomotorPdf.generar(boletas.map(TasaBoletaDatos.expandir));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="tasa-automotor-${dominio}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error("Error al generar boleta automotor:", error);
    return res.status(500).json({ message: "No se pudo generar el PDF de las boletas." });
  }
};
