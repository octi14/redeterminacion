const { Schema, model } = require("mongoose");

const observaciónSchema = new Schema(
  {
    tipo: String,
    fila: Number,
    columna: String,
    mensaje: String,
  },
  { _id: false }
);

const vencimientoCalendarioSchema = new Schema(
  {
    orden: { type: Number, required: true },
    fecha: { type: Date, required: true },
  },
  { _id: false }
);

const calendarioPeriodoSchema = new Schema(
  {
    anio: { type: Number, required: true },
    cuota: { type: Number, required: true },
    vencimientos: { type: [vencimientoCalendarioSchema], default: [] },
  },
  { _id: false }
);

const tasaUrbanaImportacionSchema = new Schema(
  {
    nombreArchivo: { type: String, required: true },
    tamanoBytes: { type: Number, default: 0 },
    hashArchivo: { type: String },
    estado: {
      type: String,
      enum: ["procesando", "completada", "fallida"],
      default: "procesando",
      index: true,
    },
    formato: { type: String },
    periodos: { type: [String], default: [] },
    calendarioPeriodos: { type: [calendarioPeriodoSchema], default: [] },
    cantidadEntradas: { type: Number, default: 0 },
    cantidadObjetos: { type: Number, default: 0 },
    cantidadImportadas: { type: Number, default: 0 },
    cantidadDesactivadas: { type: Number, default: 0 },
    cantidadErrores: { type: Number, default: 0 },
    cantidadAdvertencias: { type: Number, default: 0 },
    observaciones: { type: [observaciónSchema], default: [] },
    importBatchId: { type: Schema.Types.ObjectId, index: true },
    subidoPor: {
      id: { type: Schema.Types.ObjectId, ref: "users" },
      username: { type: String },
    },
    progreso: {
      etapa: { type: String },
      procesadas: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      porcentaje: { type: Number, default: 0 },
      mensaje: { type: String },
      error: { type: String },
      actualizadoAt: { type: Date },
    },
    archivoOriginal: {
      almacenado: { type: Boolean, default: false },
      url: { type: String },
      key: { type: String },
    },
  },
  { timestamps: true, versionKey: false, collection: "tasaurbanaimportaciones" }
);

module.exports = model("tasaUrbanaImportacion", tasaUrbanaImportacionSchema);
