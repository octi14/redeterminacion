const { Schema, model } = require('mongoose');

const proveedorSchema = new Schema({
    nombre: { type: String },
    tiposCombustible: [String],
},
    {
    timestamps: true,
    }
);

module.exports = model('proveedores', proveedorSchema);
