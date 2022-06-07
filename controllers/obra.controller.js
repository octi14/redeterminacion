let ObraService = require("../services/obra.service");

exports.getAll = async function (req, res) {
  try {
    // const { sort, skip, limit } = req.pagination;
    let obras = await ObraService.findAll(
      // sort, skip, limit
      );
    return res.status(200).json({
      data: obras,
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
      expediente,
      objeto,
      presup_oficial,
      adjudicado,
      proveedor,
      cotizacion,
      items,
      garantia_contrato,
      adjudicacion,
      contrato,
      fecha_contrato,
      acta_inicio,
      ordenanza,
      decreto,
      plazo_obra,
      anticipo_finan,
      ponderacion,
    } = req.body.obra;

    const obraData = {
      expediente,
      objeto,
      presup_oficial,
      adjudicado,
      proveedor,
      cotizacion,
      items,
      garantia_contrato,
      adjudicacion,
      contrato,
      fecha_contrato,
      acta_inicio,
      ordenanza,
      decreto,
      plazo_obra,
      anticipo_finan,
      ponderacion,
    };

    const createdFile = await ObraService.create(obraData);

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
    const obra = await ObraService.getById(id);
    const {
      expediente,
      objeto,
      presup_oficial,
      adjudicado,
      proveedor,
      cotizacion,
      garantia_contrato,
      adjudicacion,
      items,
      certificados,
      contrato,
      fecha_contrato,
      acta_inicio,
      ordenanza,
      decreto,
      plazo_obra,
      anticipo_finan,
    } = req.body.obra;
    console.log(req.body.obra);

    const updated = await ObraService.update(id, {
      expediente: expediente,
      objeto: objeto,
      adjudicado: adjudicado,
      cotizacion: cotizacion,
      proveedor: proveedor,
      presup_oficial: presup_oficial,
      garantia_contrato:  garantia_contrato,
      adjudicacion: adjudicacion,
      items: items,
      certificados: certificados,
      contrato: contrato,
      fecha_contrato: fecha_contrato,
      acta_inicio: acta_inicio,
      ordenanza: ordenanza,
      decreto: decreto,
      plazo_obra: plazo_obra,
      anticipo_finan: anticipo_finan,
    });

    return res.status(200).json({
      message: "Obra modificada.",
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

    await ObraService.delete(id);

    return res.status(200).json({
      message: "Obra eliminada.",
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
    let obra = await ObraService.getById(id);
    return res.status(200).json({
      data: obra,
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
    let obra = await ObraService.getByObjeto(objeto);
    return res.status(200).json({
      data: obra,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.search = async function (req, res) {
  try {
    const { expediente, objeto, adjudicado } = req.body;
    let obras = await ObraService.search(expediente, objeto, adjudicado);
    return res.status(200).json({
      data: obras,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
