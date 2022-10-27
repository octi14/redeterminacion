let CertificadoService = require("../services/certificado.service");

exports.getAll = async function (req, res) {
  try {
    // const { sort, skip, limit } = req.pagination;
    let certificados = await CertificadoService.findAll(
      // sort, skip, limit
      );
    return res.status(200).json({
      data: certificados,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.add = async function (req, res) {
  try {
    const { sub: user } = req.user;

    // TODO: validate req.body
    const {
      obra,
      items,
    } = req.body.certificado;

    const certificadoData = {
      obra,
      items,
    };

    const createdFile = await CertificadoService.create(certificadoData);

    return res.status(201).json({
      message: "Created",
      data: createdFile,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.update = async function (req, res) {
  try {
    // TODO: validate req.params and req.body
    const { id } = req.params;
    const certificado = await CertificadoService.getById(id);
    const {
      nro,
      fecha,
      factura,
      op,
      fecha_cancelacion,
    } = req.body.certificado;

    const updated = await CertificadoService.update(id, {
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
    const id  = req.params.name;
    // const { sub: user } = req.user;

    await CertificadoService.delete(id);

    return res.status(200).json({
      message: "Certificado eliminado.",
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getById = async function (req, res) {
  try {
    // TODO: validate req.params
    const { id } = req.params;
    let certificado = await CertificadoService.getById(id);
    return res.status(200).json({
      data: certificado,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getByObjeto = async function (req, res) {
  try {
    // TODO: validate req.params
    const { objeto } = req.params;
    let certificado = await CertificadoService.getByObjeto(objeto);
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
    let certificados = await CertificadoService.getByObra(obra);
    return res.status(200).json({
      data: certificados,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
