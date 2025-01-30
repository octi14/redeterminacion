const { Schema, model } = require('mongoose');

const valeCombustibleSchema = new Schema({
    orden: { type: Schema.Types.ObjectId },
    monto: { type: Number },
    tipoCombustible: { type: String },
    area: { type: String },
    fechaEmision: { type: Date },
    consumido: { type: Boolean },
}, 
{
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
});

module.exports = model('valeCombustible', valeCombustibleSchema);
