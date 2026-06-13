const TasaBoleta = require("../models/tasaBoleta.model");
const TasaUrbanaPdf = require("../services/tasaUrbanaPdf.service");

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

exports.buscar = async function buscar(req, res) {
  try {
    const partida = validarPartida(req, res);
    if (!partida) return;
    const boletas = await TasaBoleta.find({ tipoTasa: "URBANA", objetoClave: partida, activa: true })
      .select("periodo anio cuota importeCentavos vencimientos.fecha vencimientos.importeCentavos objeto")
      .sort({ anio: 1, cuota: 1 })
      .lean();
    if (!boletas.length) return res.status(404).json({ message: "No encontramos boletas activas para esa partida." });
    return res.status(200).json({
      data: {
        partida,
        inmueble: boletas[0].objeto,
        maxPeriodosPorDescarga: MAX_PERIODOS_POR_DESCARGA,
        periodos: boletas.map((boleta) => ({
          periodo: boleta.periodo,
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
      periodo: { $in: periodos },
      activa: true,
    }).sort({ anio: 1, cuota: 1 }).lean();
    if (boletas.length !== periodos.length) {
      return res.status(404).json({ message: "Uno o más períodos seleccionados ya no están disponibles." });
    }
    const pdf = await TasaUrbanaPdf.generar(boletas);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="tasa-urbana-${partida}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error("Error al generar boleta urbana:", error);
    return res.status(500).json({ message: "No se pudo generar el PDF de las boletas." });
  }
};
