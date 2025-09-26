const { Schema, model } = require('mongoose');

const vehiculoSchema = new Schema({
    dominio: { type: String, required: true },
    area: { type: String },
},
{
    timestamps: true,
}
);

module.exports = model('vehiculo', vehiculoSchema);
