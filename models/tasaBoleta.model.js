const { Schema, model } = require("mongoose");

const tasaBoletaSchema = new Schema(
  {
    tipoTasa: { type: String, default: "AUTOMOTORES", index: true },
    importacionId: { type: Schema.Types.ObjectId, ref: "tasaImportacion", required: true, index: true },
    objetoClave: { type: String, required: true, index: true },
    anio: { type: Number, required: true, index: true },
    cuota: { type: Number, required: true, index: true },
    periodo: { type: String, required: true, index: true },
    contribuyente: {
      nombre: { type: String },
      domicilio: { type: String },
      localidad: { type: String },
      codigoPostal: { type: String },
    },
    objeto: {
      dominio: { type: String },
      categoria: { type: String },
      marca: { type: String },
      modelo: { type: String },
      anioModelo: { type: Number },
    },
    recibo: { type: String },
    mensajeDeuda: { type: String },
    importeCentavos: { type: Number, required: true },
    vencimientos: [
      {
        orden: { type: Number, required: true },
        fecha: { type: Date, required: true },
        importeCentavos: { type: Number, required: true },
        codigoBarra: { type: String, required: true },
      },
    ],
    codigosPago: {
      pagoMisCuentas: { type: String },
      redLink: { type: String },
    },
    activa: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

tasaBoletaSchema.index(
  { tipoTasa: 1, objetoClave: 1, anio: 1, cuota: 1, activa: 1 },
  { unique: true, partialFilterExpression: { activa: true } }
);

module.exports = model("tasaBoleta", tasaBoletaSchema);
