const { Schema, model } = require('mongoose');

const configSchema = new Schema({
  key: { type: String, required: true, unique: true }, // Clave de la configuración
  value: { type: Schema.Types.Mixed, required: true }, // Valor de la configuración (puede ser cualquier tipo de dato)
  description: { type: String }, // Descripción opcional de la configuración
}, {
  timestamps: true,
});

module.exports = model('Config', configSchema);
