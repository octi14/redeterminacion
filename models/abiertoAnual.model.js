const { Schema, model } = require('mongoose');

const abiertoAnualSchema = new Schema({
    cuit: { type: Number },
    nroLegajo: { type: Number },
    dfe: { type: String },
    facturas: [{
      url: { type: String },
      observaciones: { type: String, default: '' },
      rectificando: { type: Boolean, default: false, },
    }],
    status: [String],
    fechasCarga: [Date],
    anio: { type: Number },
},
    {
    timestamps: true,
    }
);

module.exports = model('abiertoAnual', abiertoAnualSchema);
