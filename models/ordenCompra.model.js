const { Schema, model } = require('mongoose');

const ordenCompraSchema = new Schema({
    nroOrden: { type: String },
    area: { type: String },
    monto: {
        montoSuper: { type: Number },
        montoVPower: { type: Number },
    },
    vales: {
        type: [Schema.Types.ObjectId], // Array de ObjectId
        default: [], // Por defecto es un array vacío
    },
    saldoRestante: { 
        saldoSuper: { type: Number },
        saldoVPower: { type: Number },
    },
    observaciones:{
        type: [String],
    },
}, 
{
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
});

module.exports = model('ordenCompra', ordenCompraSchema);
