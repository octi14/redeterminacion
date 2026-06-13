const TasaBoleta = require("../models/tasaBoleta.model");
const TasaAutomotorPdf = require("../services/tasaAutomotorPdf.service");

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

exports.buscar = async function buscar(req, res) {
  try {
    const dominio = validarDominio(req, res);
    if (!dominio) return;
    const boletas = await TasaBoleta.find({
      tipoTasa: "AUTOMOTORES",
      objetoClave: dominio,
      activa: true,
    })
      .select("periodo anio cuota importeCentavos vencimientos.fecha vencimientos.importeCentavos objeto")
      .sort({ anio: 1, cuota: 1 })
      .lean();
    if (!boletas.length) return res.status(404).json({ message: "No encontramos boletas activas para ese dominio." });
    return res.status(200).json({
      data: {
        dominio,
        vehiculo: boletas[0].objeto,
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
    const dominio = validarDominio(req, res);
    if (!dominio) return;
    const periodos = Array.isArray(req.body.periodos) ? [...new Set(req.body.periodos)] : [];
    if (!periodos.length || periodos.length > 24) {
      return res.status(400).json({ message: "Seleccioná entre 1 y 24 períodos." });
    }
    const boletas = await TasaBoleta.find({
      tipoTasa: "AUTOMOTORES",
      objetoClave: dominio,
      periodo: { $in: periodos },
      activa: true,
    })
      .sort({ anio: 1, cuota: 1 })
      .lean();
    if (boletas.length !== periodos.length) {
      return res.status(404).json({ message: "Uno o más períodos seleccionados ya no están disponibles." });
    }
    const pdf = await TasaAutomotorPdf.generar(boletas);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="tasa-automotor-${dominio}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error("Error al generar boleta automotor:", error);
    return res.status(500).json({ message: "No se pudo generar el PDF de las boletas." });
  }
};
