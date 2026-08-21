const { Schema, model } = require("mongoose");

const vencimientoSchema = new Schema(
  {
    orden: { type: Number, required: true },
    fecha: { type: Date, required: true },
    importeCentavos: { type: Number, required: true },
    codigoBarra: { type: String, required: true },
  },
  { _id: false }
);

const tasaUrbanaDeudaSchema = new Schema(
  {
    partida: { type: String, required: true, index: true },
    contribuyente: {
      nombre: String,
      domicilio: String,
      localidad: String,
      codigoPostal: String,
    },
    objeto: {
      partida: String,
      catastro: String,
      parcela: String,
      metrosConstruidos: Number,
      zona: String,
    },
    anio: { type: Number, required: true },
    cuota: { type: Number, required: true },
    recibo: String,
    debito: String,
    mensajeDeuda: String,
    mensajeBoleta: String,
    codigosPago: {
      pagoMisCuentas: String,
      redLink: String,
    },
    /** [indiceConcepto, importeCentavos] alineado a CONCEPTOS_URBANA del importador */
    conceptosCompactos: [[Number]],
    importeCentavos: { type: Number, required: true },
    vencimientos: { type: [vencimientoSchema], required: true },
    activa: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
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
