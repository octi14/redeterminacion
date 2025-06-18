const { Schema, model } = require('mongoose');

const documentoSchema = new Schema(
  {
    documentos: [{
      nombreDocumento: { type: String },
      contenido: { type: Schema.Types.ObjectId },
      url: { type: String }, // Nuevo campo para almacenar la URL
    }]
  },
  { autoIndex: false } // Evitar que se generen índices automáticos
);

const solicitanteSchema = new Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  dni: { type: String, required: true },
  cuit: { type: Number, required: true },
  nroCuenta: {type: String, required: true},
  domicilioReal: { type: String, required: true },
  telefono: { type: Number, required: true },
  codigoPostal: { type: String, required: true },
  localidad: { type: String, required: true }, //Preguntar a myriam
  provincia: { type: String, required: true },
  mail: { type: String, required: true },
  esApoderado: { type: Boolean, default: false },
});

const pagoDobleSchema = new Schema({
  documentos: documentoSchema,
  solicitante: solicitanteSchema,
  status: {
    type: String,
    default: 'En revisión',
  },
  observaciones: {
    type: String,
  },
  nroSolicitud: {
    type: Number,
  },
  nroExpediente:{
    type:String,
  },
  alcance: {
    type: Number,
  },
},
{
  timestamps: true,
}
);

module.exports = model('PagoDoble', pagoDobleSchema);
