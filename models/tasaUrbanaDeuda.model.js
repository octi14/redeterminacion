const { Schema, model } = require("mongoose");

const vencimientoSchema = new Schema(
  {
    orden: { type: Number, required: true },
    importeCentavos: { type: Number, required: true },
    codigoBarra: { type: String, required: true },
    /** Solo en datos legacy/QA; en import nuevo las fechas viven en calendarioPeriodos. */
    fecha: Date,
  },
  { _id: false }
);

const tasaUrbanaDeudaSchema = new Schema(
  {
    partida: { type: String, required: true },
    contribuyente: {
      nombre: String,
      domicilio: String,
      localidad: String,
      codigoPostal: String,
    },
    objeto: {
      catastro: String,
      parcela: String,
      metrosConstruidos: Number,
      zona: String,
    },
    anio: { type: Number, required: true },
    cuota: { type: Number, required: true },
    recibo: String,
    debito: String,
    deudaAnterior: { type: Boolean, default: false },
    /** Solo cuando deudaAnterior y el TEXTO-2 trae montos/años personalizados. */
    mensajeBoletaPersonalizado: String,
    /** [indiceConcepto, importeCentavos] alineado a CONCEPTOS_URBANA del importador */
    conceptosCompactos: [[Number]],
    importeCentavos: { type: Number, required: true },
    vencimientos: { type: [vencimientoSchema], required: true },
    /** Identifica la corrida de importación para activar/desactivar por lotes. */
    importBatchId: { type: Schema.Types.ObjectId },
    activa: { type: Boolean, default: true },
    pagado: { type: Boolean, default: false },
    pagadoAt: { type: Date },
    pagadoPreorderUuid: { type: String },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "tasaurbanadeudas",
  }
);

tasaUrbanaDeudaSchema.index(
  { partida: 1, anio: 1, cuota: 1 },
  { unique: true, partialFilterExpression: { activa: true } }
);

tasaUrbanaDeudaSchema.virtual("periodo").get(function periodo() {
  return `${String(this.cuota).padStart(2, "0")}/${this.anio}`;
});

module.exports = model("tasaUrbanaDeuda", tasaUrbanaDeudaSchema);
