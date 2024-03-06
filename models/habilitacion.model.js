const { Schema, model } = require('mongoose');

const documentoSchema = new Schema(
  {
    documentos: [{
      nombreDocumento: { type: String },
      contenido: { type: Schema.Types.ObjectId }
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
  documentosAntiguos: {
    planillaAutorizacion: { type: Schema.Types.ObjectId },
    dniFrente: { type: Schema.Types.ObjectId },
    dniDorso: { type: Schema.Types.ObjectId },
    constanciaCuit: { type: Schema.Types.ObjectId },
    constanciaIngresosBrutos: { type: Schema.Types.ObjectId },
    actaPersonaJuridica: { type: Schema.Types.ObjectId },
    actaDirectorio: { type: Schema.Types.ObjectId },
    libreDeudaUrbana: { type: Schema.Types.ObjectId },
    tituloPropiedad: { type: Schema.Types.ObjectId },
    plano: { type: Schema.Types.ObjectId },
    certificadoDomicilio: { type: Schema.Types.ObjectId },
    croquis: { type: Schema.Types.ObjectId }
  },
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
