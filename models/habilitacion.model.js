const { Schema, model } = require('mongoose');

const documentoSchema = new Schema({
  planillaAutorizacion: { data: Buffer, contentType: String },
  dniFrente: { data: Buffer, contentType: String },
  dniDorso: { data: Buffer, contentType: String },
  constanciaCuit: { data: Buffer, contentType: String },
  constanciaIngresosBrutos: { data: Buffer, contentType: String },
  actaPersonaJuridica: { data: Buffer, contentType: String },
  actaDirectorio: { data: Buffer, contentType: String },
  libreDeudaUrbana: { data: Buffer, contentType: String },
  tituloPropiedad: { data: Buffer, contentType: String },
  plano: { data: Buffer, contentType: String },
  certificadoDomicilio: { data: Buffer, contentType: String },
  croquis: { data: Buffer, contentType: String}
});

const solicitanteSchema = new Schema({
  tipoSolicitud: { type: String, required: true },
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  DNI: { type: Number, required: true },
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
  espacioPublico: { type: Boolean, default: false },
  serviciosHoteleria: [{ servicio: String, value: Boolean }],
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
},
{
  timestamps: true,
}
);

module.exports = model('Habilitacion', habilitacionSchema);
