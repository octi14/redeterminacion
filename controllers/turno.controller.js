let TurnoService = require("../services/turno.service");

exports.getAll = async function (req, res) {
  try {
    let turnos = await TurnoService.findAll();
    return res.status(200).json({
      data: turnos,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.add = async function (req, res) {
  try {
    // TODO: validate req.body
    const { dia, horario, nombre, dni, domicilio, nroTramite } = req.body.turno;

    const turnoData = {
      dia, horario, nombre, dni, domicilio, nroTramite
    }
    console.log(turnoData);

    const createdTurno = await TurnoService.create(turnoData);
    return res.status(201).json({
      message: "Created",
      data: createdTurno,
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
    const camposActualizados = req.body.turno; // Suponiendo que envías los campos actualizados en el cuerpo de la solicitud.


    const updated = await TurnoService.update(id, camposActualizados);

    return res.status(200).json({
      message: "Turno modificado.",
      data: updated,
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
    let turno = await TurnoService.getById(id);
    return res.status(200).json({
      data: turno,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.getByNroTramite = async function (req, res) {
  try {
    // TODO: validate req.params
    const { nroTramite } = req.params;
    let turno = await TurnoService.getByNroTramite(nroTramite);
    console.log(turno);
    return res.status(200).json({
      data: turno,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
};

exports.delete = async function (req, res) {
  try {
    // TODO: validate req.params and req.body
    const { id } = req.params;

    TurnoService.delete(id);

    return res.status(200).json({
      message: "Turno eliminado",
    });
  } catch (e) {
    return res.status(400).json({
      message: "No se pudo eliminar",
    });
  }
};
