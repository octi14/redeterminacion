const { Schema, model } = require('mongoose');

const comprobanteSchema = new Schema({
  nombre: String,
  url: String,
  contentType: String,
}, { _id: false });

const periodoCementerioSchema = new Schema({
  funerariaId: { type: Schema.Types.ObjectId, ref: 'Funeraria', required: true, index: true },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  anio: { type: Number, required: true },
  mes: { type: Number, required: true },
  estado: {
    type: String,
    enum: ['ABIERTO', 'PENDIENTE_CONFIRMACION', 'EN_PROCESO', 'APROBADO', 'RECHAZADO'],
    default: 'ABIERTO',
    index: true,
  },
  comprobantePagoMensual: comprobanteSchema,
  estadoRevisionPagoMensual: {
    type: String,
    enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO'],
    default: 'PENDIENTE',
  },
  observacionPagoMensual: String,
  fechaConfirmacion: Date,
  fechaResolucion: Date,
  confirmadoPorUsuarioId: { type: Schema.Types.ObjectId, ref: 'users' },
  resueltoPorUsuarioId: { type: Schema.Types.ObjectId, ref: 'users' },
  observacionResolucion: String,
  resumenConfirmado: Schema.Types.Mixed,
  totalConfirmado: Number,
}, {
  timestamps: true,
  collection: 'periodosCementerio',
});

periodoCementerioSchema.index({ funerariaId: 1, anio: 1, mes: 1 }, { unique: true });

module.exports = model('PeriodoCementerio', periodoCementerioSchema);
