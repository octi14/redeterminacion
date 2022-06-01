let CategoriaService = require("../services/categoria.service");

exports.getAll = async function (req, res) {
  try {
    // const { sort, skip, limit } = req.pagination;
    let categorias = await CategoriaService.findAll(
      // sort, skip, limit
      );
    return res.status(200).json({
      data: categorias,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.add = async function (req, res) {
  try {
    // const { sub: user } = req.user;

    // TODO: validate req.body
    const {
      nombre,
    } = req.body;

    const categoriaData = {
      nombre,
    };

    console.log(categoriaData);

    const createdFile = await CategoriaService.create(categoriaData);

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
    const { id } = req.params;

    await CertificadoService.delete(id);

    return res.status(200).json({
      message: "Certificado eliminada.",
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
    console.log(objeto);
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
    let certificados = await CertificadoService.search(obra);
    return res.status(200).json({
      data: certificados,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
