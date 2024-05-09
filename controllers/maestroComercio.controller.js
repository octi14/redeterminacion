let MaestroComercioService = require("../services/maestroComercio.service");

exports.getAll = async function (req, res) {
  try {
    // const { sort, skip, limit } = req.pagination;
    let registros = await MaestroComercioService.findAll(
      // sort, skip, limit
      );
    return res.status(200).json({
      data: registros,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.create = async function(req, res) {
  try {
    const fileContent = req.body.file;

    // Llamar al servicio para procesar el archivo CSV
    await MaestroComercioService.processCSV(fileContent);

    res.status(200).send('Archivo CSV procesado correctamente');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al procesar el archivo CSV');
  }
}

exports.update = async function (req, res) {
  try {
    // TODO: validate req.params and req.body
    const { id } = req.params;
    const certificado = await MaestroComercioService.getById(id);
    const {
      nro,
      fecha,
      factura,
      op,
      fecha_cancelacion,
    } = req.body.certificado;

    const updated = await MaestroComercioService.update(id, {
      nro: nro,
      fecha: fecha,
      factura: factura,
      op: op,
      fecha_cancelacion: fecha_cancelacion,
    });

    return res.status(200).json({
      message: "Certificado modificada.",
      data: updated,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.delete = async function (req, res) {
  try {
    // TODO: validate req.params
    const { id } = req.params;

    await MaestroComercioService.delete(id);

    return res.status(200).json({
      message: "Certificado eliminada.",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getSingle = async function (req, res) {
  try {
    // TODO: validate req.params
    const { cuit, legajo } = req.body;
    let certificado = await MaestroComercioService.search({
      cuit: cuit,
      legajo: legajo
    })
    return res.status(200).json({
      data: certificado,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.search = async function (req, res) {
  try {
    const { obra } = req.body;
    let certificados = await MaestroComercioService.search(obra);
    return res.status(200).json({
      data: certificados,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
