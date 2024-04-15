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
    cuit: { type: String },
    nroLegajo: { type: Number },
    dfe: { type: String },
    facturas: facturaSchema,
    status: [String],
    observaciones: { type: String },
},
    {
    timestamps: true,
    }
);

module.exports = model('abiertoAnual', abiertoAnualSchema);
