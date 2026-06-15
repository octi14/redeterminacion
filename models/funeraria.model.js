const { Schema, model } = require('mongoose');

const funerariaSchema = new Schema({
  nombre: { type: String, required: true },
  cuit: { type: String, required: true, unique: true },
  responsable: { type: String },
  telefono: { type: String },
  mail: { type: String },
  responsableCierreUsuarioId: { type: Schema.Types.ObjectId, ref: 'users', default: null },
  activa: { type: Boolean, default: true },
}, {
  timestamps: true,
  collection: 'funerarias',
});

module.exports = model('Funeraria', funerariaSchema);
