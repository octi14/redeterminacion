let RedeterminacionService = require("../services/redeterminacion.service");
let CertificadoService = require("../services/certificado.service");

exports.getAll = async function (req, res) {
  try {
    // const { sort, skip, limit } = req.pagination;
    let redeterminacions = await RedeterminacionService.findAll(
      // sort, skip, limit
      );
    return res.status(200).json({
      data: redeterminacions,
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
      certificado,
      items,
    } = req.body;

    const redeterminacionData = {
      obra,
      certificado,
      items,
    };

    const createdFile = await RedeterminacionService.create(redeterminacionData);

    const fecha = Date.now();
    await CertificadoService.update(redeterminacionData.certificado, {
      redeterminado: fecha,
    })

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
    const redeterminacion = await RedeterminacionService.getById(id);
    const {
      obra,
      items,
    } = req.body.redeterminacion;

    const updated = await RedeterminacionService.update(id, {
      obra: obra,
      items: items,
    });

    return res.status(200).json({
      message: "Redeterminacion modificada.",
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
    const id = req.params.name;
    const redeterminacion = await RedeterminacionService.getById(id);
    const certificado = await CertificadoService.getById(redeterminacion.certificado);

    await CertificadoService.update(certificado, {
      redeterminado: null,
    })

    await RedeterminacionService.delete(id);

    return res.status(200).json({
      message: "Redeterminacion eliminada.",
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
    let redeterminacion = await RedeterminacionService.getById(id);
    return res.status(200).json({
      data: redeterminacion,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.search = async function (req, res) {
  try {
    const { obra, certificado } = req.body;
    let redeterminacions = await RedeterminacionService.search(obra, certificado);
    return res.status(200).json({
      data: redeterminacions,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.searchByObra = async function (req, res) {
  try {
    const { obra } = req.body;
    let redeterminacions = await RedeterminacionService.getByObra(obra);
    return res.status(200).json({
      data: redeterminacions,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
