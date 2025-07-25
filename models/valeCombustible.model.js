const { Schema, model } = require('mongoose');

const valeCombustibleSchema = new Schema({
    nro_vale: { type: Number, required: true },
    orden: { type: Schema.Types.ObjectId },
    monto: { type: Number },
    tipoCombustible: { type: String },
    area: { type: String },
    dominio: {type: String},
    fechaEmision: { type: Date },
    consumido: { type: Boolean },
    anulado: { type: Boolean },
},
{
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
});

module.exports = model('valeCombustible', valeCombustibleSchema);
