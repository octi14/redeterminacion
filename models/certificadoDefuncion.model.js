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
  obito: obitoSchema,
  documentos: documentoSchema,
  estado: { type: String, default: 'En revisión' },
}, {
  timestamps: true,
  collection: 'certificadosDefuncion'
});

module.exports = model('CertificadoDefuncion', certificadoDefuncionSchema);



