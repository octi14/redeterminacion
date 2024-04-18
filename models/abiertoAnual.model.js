const { Schema, model } = require('mongoose');

const facturaSchema = new Schema(
    {
      facturas: [{
        contenido: { type: Schema.Types.ObjectId },
      }]
    },
    { autoIndex: false } // Evitar que se generen índices automáticos
  );

const abiertoAnualSchema = new Schema({
    cuit: { type: Number },
    nroLegajo: { type: Number },
    dfe: { type: String },
    facturas: facturaSchema,
    status: [String],
    fechasCarga: [Date],
    anio: { type: Number },
    observaciones: { type: String },
},
    {
    timestamps: true,
    }
);

module.exports = model('abiertoAnual', abiertoAnualSchema);
