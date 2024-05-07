const { Schema, model } = require('mongoose');

const maestroComercioSchema = new Schema({
    legajo: { type: Number },
    cuit: { type: Number },
    denominacion: {type: String},
    mail: { type: String },
    titular: { type: String },
    telefono: { type: String },
    dfe: { type: String },
  },
    {
    timestamps: true,
    }
);

module.exports = model('maestroComercio', maestroComercioSchema);
