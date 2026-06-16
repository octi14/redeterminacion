const { Schema, model } = require("mongoose");

const tasaBoletaSchema = new Schema(
  {
    tipoTasa: { type: String, required: true },
    importacionId: { type: Schema.Types.ObjectId, ref: "tasaImportacion", required: true },
    objetoId: { type: Schema.Types.ObjectId, ref: "tasaObjeto", required: true },
    objetoClave: { type: String, required: true },
    anio: { type: Number, required: true },
    cuota: { type: Number, required: true },
    recibo: String,
    conceptosCompactos: [[Number]],
    importeCentavos: { type: Number, required: true },
    vencimientos: [
      {
        _id: false,
        orden: { type: Number, required: true },
        fecha: { type: Date, required: true },
        importeCentavos: { type: Number, required: true },
        codigoBarra: { type: String, required: true },
      },
    ],
    activa: { type: Boolean, default: false },
  },
  { timestamps: false, versionKey: false }
);

tasaBoletaSchema.virtual("periodo").get(function periodo() {
  return `${String(this.cuota).padStart(2, "0")}/${this.anio}`;
});

tasaBoletaSchema.index(
  { tipoTasa: 1, objetoClave: 1, anio: 1, cuota: 1 },
  { unique: true, partialFilterExpression: { activa: true } }
);
tasaBoletaSchema.index({ importacionId: 1, anio: 1, cuota: 1, activa: 1 });
tasaBoletaSchema.index({ tipoTasa: 1, anio: 1, cuota: 1, activa: 1 });

module.exports = model("tasaBoleta", tasaBoletaSchema);
