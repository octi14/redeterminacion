const { Schema, model } = require("mongoose");

const TurnoSchema = new Schema(
  {
    dia: {
      type: Date,
    },
    horario: {
      type: String,
    },
    nombre: {
      type: String,
    },
    dni: {
      type: Number,
    },
    domicilio: {
      type: String,
    },
    status: {
      type: String,
      default: 'En revisión',
    },
    nroTramite: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("turno", TurnoSchema);
