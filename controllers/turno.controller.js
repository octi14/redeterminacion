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
    const { dia, horario, nombre, dni, domicilio } = req.body.turno;

    const turnoData = {
      dia, horario, nombre, dni, domicilio
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
    const {
      dia,
      horario,
      nombre,
      dni,
      domicilio,
    } = req.body.turno;

    const updated = await TurnoService.update(id, {
      dia: dia,
      horario: horario,
      nombre: nombre,
      dni: dni,
      domicilio: domicilio,
    });

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

// exports.getByCategoria = async function (req, res) {
//   try {
//     // TODO: validate req.params
//     const { categoria } = req.body;
//     let multimedia = await MultimediaService.getByCategoria(categoria);
//     return res.status(200).json({
//       data: multimedia,
//     });
//   } catch (e) {
//     return res.status(400).json({
//       message: e.message,
//     });
//   }
// };
