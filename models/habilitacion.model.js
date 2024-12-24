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
  tipoSolicitud: { type: String, required: true },
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  dni: { type: String, required: true },
  cuit: { type: Number, required: true },
  razonSocial: String,
  domicilioReal: { type: String, required: true },
  telefono: { type: Number, required: true },
  codigoPostal: { type: String, required: true },
  localidad: { type: String, required: true }, //Preguntar a myriam
  provincia: { type: String, required: true },
  mail: { type: String, required: true },
  esApoderado: { type: Boolean, default: false },
});

const inmuebleSchema = new Schema({
  localidad: { type: String, required: true },
  calle: { type: String, required: true },
  nro: { type: Number, required: true},
  nroLocal: String,
  nombreFantasia: String,
  rubro: { type: String, required: true },
  descripcionRubro: { type: String },
  espacioPublico: { type: Boolean, default: false },
  serviciosHoteleria: [{ servicio: String, value: Boolean }],
  otrosServicios: { type: String, },
  marquesina: { type: Boolean, default: false },
  mercaderia: { type: Boolean, default: false },
  mesas: { type: Boolean, default: false },
  carteles: { type: Boolean, default: false }
});

const habilitacionSchema = new Schema({
  documentos: documentoSchema,
  solicitante: solicitanteSchema,
  inmueble: inmuebleSchema,
  status: {
    type: String,
    default: 'En revisión',
  }, //chequear con myriam
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
  nroLegajo: {
    type: Number,
  },
},
{
  timestamps: true,
}
);

module.exports = model('Habilitacion', habilitacionSchema);
