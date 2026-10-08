const TasaUrbanaDeuda = require("../models/tasaUrbanaDeuda.model");
const TasaUrbanaBoletaService = require("../services/tasaUrbanaBoleta.service");
const { expandirDeudas } = require("../services/tasaUrbanaCompacto");
const TasaUrbanaPdf = require("../services/tasaUrbanaPdf.service");
const TasaImportacionService = require("../services/tasaImportacion.service");
const User = require("../models/user.model");

const MAX_PERIODOS_POR_DESCARGA = 20;
const PRIVILEGED_ROLES = ["admin", "master", "true", "boletas", "hacienda"];
const LONGITUD_PARTIDA = 8;

function clavesPartidaParaBusqueda(value) {
  const clave = String(value || "").replace(/\s/g, "").toUpperCase();
  if (!clave) return [];
  const sinCeros = clave.replace(/^0+/, "") || "0";
  const padded =
    sinCeros.length < LONGITUD_PARTIDA
      ? sinCeros.padStart(LONGITUD_PARTIDA, "0")
      : clave.length < LONGITUD_PARTIDA
        ? clave.padStart(LONGITUD_PARTIDA, "0")
        : clave;
  return [...new Set([clave, sinCeros, padded])];
}

function validarPartida(req, res) {
  const raw = String(req.params.partida || "").replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z0-9]{3,16}$/.test(raw)) {
    res.status(400).json({ message: "Ingresá un número de partida válido." });
    return null;
  }
  return raw;
}

function filtroPeriodos(periodos) {
  return {
    $or: periodos.map((periodo) => {
      const [cuota, anio] = periodo.split("/").map(Number);
      return { cuota, anio };
    }),
  };
}

async function usuarioPrivilegiado(req) {
  if (!req.auth || !req.auth.sub) return false;
  const user = await User.findById(req.auth.sub).select("admin").lean();
  const role = String((user && user.admin) || "").trim().toLowerCase();
  return PRIVILEGED_ROLES.includes(role);
}

async function puedeConsultarModulo(req) {
  if (await usuarioPrivilegiado(req)) return true;
  return TasaImportacionService.tasaAutomotorPublicaHabilitada();
}

function periodoLabel(cuota, anio) {
  return `${String(cuota).padStart(2, "0")}/${anio}`;
}

exports.buscar = async function buscar(req, res) {
  try {
    if (!(await puedeConsultarModulo(req))) {
      return res.status(403).json({ message: "La descarga de tasa urbana no se encuentra disponible." });
    }
    const partidaIngresada = validarPartida(req, res);
    if (!partidaIngresada) return;
    const claves = clavesPartidaParaBusqueda(partidaIngresada);
    const deudas = await expandirDeudas(await TasaUrbanaDeuda.find({
      partida: { $in: claves },
      activa: true,
    })
      .sort({ anio: 1, cuota: 1 })
      .lean());
    if (!deudas.length) {
      return res.status(404).json({ message: "No encontramos boletas activas para esa partida." });
    }
    const calendarios = await TasaUrbanaBoletaService.cargarCalendariosPorBatch(
      deudas.map((doc) => doc.importBatchId)
    );
    const first = deudas[0];
    return res.status(200).json({
      data: {
        partida: first.partida,
        contribuyente: first.contribuyente || {},
        objeto: first.objeto || {},
        maxPeriodosPorDescarga: MAX_PERIODOS_POR_DESCARGA,
        periodos: deudas.map((doc) => {
          const calendarioPeriodos = calendarios.get(String(doc.importBatchId)) || [];
          const vencimientos = TasaUrbanaBoletaService.hidratarVencimientos(doc, calendarioPeriodos);
          return {
            periodo: periodoLabel(doc.cuota, doc.anio),
            anio: doc.anio,
            cuota: doc.cuota,
            importeCentavos: doc.importeCentavos,
            vencimientos: vencimientos.map((item) => ({
              orden: item.orden,
              fecha: item.fecha,
              importeCentavos: item.importeCentavos,
            })),
          };
        }),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "No se pudieron consultar las boletas." });
  }
};

exports.descargar = async function descargar(req, res) {
  try {
    if (!(await puedeConsultarModulo(req))) {
      return res.status(403).json({ message: "La descarga de tasa urbana no se encuentra disponible." });
    }
    const partidaIngresada = validarPartida(req, res);
    if (!partidaIngresada) return;
    const periodos = Array.isArray(req.body.periodos) ? [...new Set(req.body.periodos)] : [];
    if (!periodos.length) {
      return res.status(400).json({ message: "Seleccioná al menos un período para generar el PDF." });
    }
    if (periodos.length > MAX_PERIODOS_POR_DESCARGA) {
      return res.status(400).json({
        message: `Seleccionaste ${periodos.length} períodos. El máximo permitido por descarga es ${MAX_PERIODOS_POR_DESCARGA}.`,
      });
    }
    const claves = clavesPartidaParaBusqueda(partidaIngresada);
    const deudas = await expandirDeudas(await TasaUrbanaDeuda.find({
      partida: { $in: claves },
      activa: true,
      ...filtroPeriodos(periodos),
    })
      .sort({ anio: 1, cuota: 1 })
      .lean());
    if (deudas.length !== periodos.length) {
      return res.status(404).json({ message: "Uno o más períodos seleccionados ya no están disponibles." });
    }
    const calendarios = await TasaUrbanaBoletaService.cargarCalendariosPorBatch(
      deudas.map((doc) => doc.importBatchId)
    );
    const partida = deudas[0].partida;
    const codigosPorPartida = await TasaUrbanaBoletaService.cargarCodigosPorPartida(
      deudas[0].importBatchId,
      [partida]
    );
    const boletas = deudas.map((doc) => {
      const hidratada = TasaUrbanaBoletaService.hidratarBoletaUrbana(doc, {
        calendarioPeriodos: calendarios.get(String(doc.importBatchId)) || [],
        codigosPago: codigosPorPartida.get(doc.partida) || {},
      });
      return {
        ...hidratada,
        partida: hidratada.partida,
        periodo: periodoLabel(hidratada.cuota, hidratada.anio),
      };
    });
    const pdf = await TasaUrbanaPdf.generar(boletas);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="tasa-urbana-${partida}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error("Error al generar boleta urbana:", error);
    return res.status(500).json({ message: "No se pudo generar el PDF de las boletas." });
  }
};
