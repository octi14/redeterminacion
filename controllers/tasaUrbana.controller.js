const TasaBoleta = require("../models/tasaBoleta.model");
const TasaUrbanaPdf = require("../services/tasaUrbanaPdf.service");
const TasaBoletaDatos = require("../services/tasaBoletaDatos.service");

const MAX_PERIODOS_POR_DESCARGA = 20;

function validarPartida(req, res) {
  const partidaIngresada = String(req.params.partida || "").replace(/\s/g, "").toUpperCase();
  const partida = partidaIngresada.padStart(8, "0");
  if (!/^[A-Z0-9]{1,16}$/.test(partida)) {
    res.status(400).json({ message: "Ingresá una partida válida." });
    return null;
  }
  return partida;
}

function filtroPeriodos(periodos) {
  return { $or: periodos.map((periodo) => {
    const [cuota, anio] = periodo.split("/").map(Number);
    return { cuota, anio };
  }) };
}

exports.buscar = async function buscar(req, res) {
  try {
    const partida = validarPartida(req, res);
    if (!partida) return;
    const boletas = await TasaBoleta.find({ tipoTasa: "URBANA", objetoClave: partida, activa: true })
      .select("anio cuota importeCentavos vencimientos.fecha vencimientos.importeCentavos objetoId")
      .populate("objetoId")
      .sort({ anio: 1, cuota: 1 })
      .lean();
    if (!boletas.length) return res.status(404).json({ message: "No encontramos boletas activas para esa partida." });
    const expandidas = boletas.map(TasaBoletaDatos.expandir);
    return res.status(200).json({
      data: {
        partida,
        inmueble: expandidas[0].objeto,
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
    const partida = validarPartida(req, res);
    if (!partida) return;
    const periodos = Array.isArray(req.body.periodos) ? [...new Set(req.body.periodos)] : [];
    if (!periodos.length) return res.status(400).json({ message: "Seleccioná al menos un período para generar el PDF." });
    if (periodos.length > MAX_PERIODOS_POR_DESCARGA) {
      return res.status(400).json({ message: `Seleccionaste ${periodos.length} períodos. El máximo permitido por descarga es ${MAX_PERIODOS_POR_DESCARGA}.` });
    }
    const boletas = await TasaBoleta.find({
      tipoTasa: "URBANA",
      objetoClave: partida,
      ...filtroPeriodos(periodos),
      activa: true,
    }).sort({ anio: 1, cuota: 1 }).populate({ path: "objetoId", populate: { path: "mensajeBoletaId" } }).lean();
    if (boletas.length !== periodos.length) {
      return res.status(404).json({ message: "Uno o más períodos seleccionados ya no están disponibles." });
    }
    const pdf = await TasaUrbanaPdf.generar(boletas.map(TasaBoletaDatos.expandir));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="tasa-urbana-${partida}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error("Error al generar boleta urbana:", error);
    return res.status(500).json({ message: "No se pudo generar el PDF de las boletas." });
  }
};
