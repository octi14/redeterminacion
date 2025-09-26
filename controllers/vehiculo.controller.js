let VehiculoService = require("../services/vehiculo.service");

exports.getAll = async function (req, res) {
  try {
    let vehiculos = await VehiculoService.findAll();
    return res.status(200).json({
      data: vehiculos,
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
    const { dominio, area } = req.body;

    const vehiculoData = {
      dominio,
      area,
    };

    const createdVehiculo = await VehiculoService.create(vehiculoData);

    return res.status(201).json({
      message: "Created",
      data: createdVehiculo,
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
    const { dominio, area } = req.body;

    const updated = await VehiculoService.update(id, {
      dominio,
      area,
    });

    return res.status(200).json({
      message: "Vehículo modificado.",
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

    await VehiculoService.delete(id);

    return res.status(200).json({
      message: "Vehículo eliminado.",
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
    let vehiculo = await VehiculoService.getById(id);
    return res.status(200).json({
      data: vehiculo,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getByDominio = async function (req, res) {
  try {
    // TODO: validate req.params
    const { dominio } = req.params;
    let vehiculo = await VehiculoService.getByDominio(dominio);
    return res.status(200).json({
      data: vehiculo,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.search = async function (req, res) {
  try {
    const { dominio, area } = req.body;
    let vehiculos = await VehiculoService.search(dominio, area);
    return res.status(200).json({
      data: vehiculos,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};
