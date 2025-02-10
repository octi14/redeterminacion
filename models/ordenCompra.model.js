const { Schema, model } = require('mongoose');

const ordenCompraSchema = new Schema({
    nroOrden: { type: String },
    area: { type: String },
    proveedor: { type: String },
    monto: [{
        tipoCombustible: { type: String, required: true }, // Nombre del combustible (ej: "Super", "VPower", etc.)
        monto: { type: Number, required: true } // Monto correspondiente
    }],
    vales: {
        type: [Schema.Types.ObjectId], // Array de ObjectId
        default: [], // Por defecto es un array vacío
    },
    saldoRestante: [{
        tipoCombustible: { type: String, required: true }, // Nombre del combustible
        saldo: { type: Number, required: true } // Saldo restante correspondiente
    }],
    observaciones: {
        type: [String],
    },
},
{
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
});

module.exports = model('ordenCompra', ordenCompraSchema);
