const { Schema, model } = require('mongoose');

const documentoSchema = new Schema(
  {
    documentos: [{
      nombreDocumento: { type: String },
      url: { type: String },
    }]
  },
  { autoIndex: false }
);

const funerariaSchema = new Schema({
  cuit: { type: String, required: true },
  responsable: { type: String, required: true },
  telefono: { type: String, required: true },
  mail: { type: String, required: true },
});

const obitoSchema = new Schema({
  apellido: { type: String, required: true },
  nombre: { type: String, required: true },
  tipoDocumento: { type: String, required: true },
  numeroDocumento: { type: String, required: true },
  fechaDefuncion: { type: Date, required: true },
});

const certificadoDefuncionSchema = new Schema({
  funeraria: funerariaSchema,
  funerariaId: { type: Schema.Types.ObjectId, ref: 'Funeraria', index: true },
  periodoId: { type: Schema.Types.ObjectId, ref: 'PeriodoCementerio', index: true },
  obito: obitoSchema,
  documentos: documentoSchema,
  tipoSepultura: { type: String, enum: ['economico', 'intermedio', 'premium'], required: true },
  precioAplicado: { type: Number, required: true },
  condicionPago: { type: String, enum: ['PAGO', 'EXENTO'], default: 'PAGO' },
  estadoRevisionPago: { type: String, enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO'], default: 'PENDIENTE' },
  observacionRevisionPago: String,
  revisadoPorUsuarioId: { type: Schema.Types.ObjectId, ref: 'users' },
  fechaRevisionPago: Date,
  creadoPorUsuarioId: { type: Schema.Types.ObjectId, ref: 'users' },
  modificadoPorUsuarioId: { type: Schema.Types.ObjectId, ref: 'users' },
  creadoPorSeed: { type: Boolean, default: false },
  estado: { type: String, default: 'En revisión' },
}, {
  timestamps: true,
  collection: 'certificadosDefuncion'
});

module.exports = model('CertificadoDefuncion', certificadoDefuncionSchema);



