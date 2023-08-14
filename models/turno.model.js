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
      default: 'Pendiente de inspección',
    },
    nroTramite: {
      type: Number,
    },
    observaciones: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("turno", TurnoSchema);
