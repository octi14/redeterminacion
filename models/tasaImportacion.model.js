const { Schema, model } = require("mongoose");

const observacionSchema = new Schema(
  {
    tipo: { type: String, enum: ["error", "advertencia"], required: true },
    fila: { type: Number },
    columna: { type: String, required: true },
    mensaje: { type: String, required: true },
  },
  { _id: false }
);

const tasaImportacionSchema = new Schema(
  {
    tipoTasa: { type: String, default: "AUTOMOTORES", index: true },
    nombreArchivo: { type: String, required: true },
    nombreArchivoClave: { type: String },
    tamanoBytes: { type: Number, default: 0 },
    hashArchivo: { type: String, required: true, index: true },
    formato: { type: String, enum: ["completo", "simplificado", "urbana", "desconocido"], required: true },
    estado: {
      type: String,
      enum: ["analizando", "analizada", "rechazada", "publicando", "fallida", "publicada", "reemplazada", "reemplazada_parcialmente", "deshabilitada"],
      required: true,
      index: true,
    },
    periodos: [{ type: String }],
    periodosActivos: [{ type: String }],
    cantidadEntradas: { type: Number, default: 0 },
    cantidadObjetos: { type: Number, default: 0 },
    cantidadErrores: { type: Number, default: 0 },
    cantidadAdvertencias: { type: Number, default: 0 },
    observaciones: [observacionSchema],
    observacionesOmitidas: { type: Number, default: 0 },
    subidoPor: {
      id: { type: Schema.Types.ObjectId, ref: "users" },
      username: { type: String },
    },
    publicadoPor: {
      id: { type: Schema.Types.ObjectId, ref: "users" },
      username: { type: String },
    },
    publicadoAt: { type: Date },
    progresoPublicacion: {
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
  { timestamps: true }
);

tasaImportacionSchema.index(
  { tipoTasa: 1, nombreArchivoClave: 1 },
  {
    unique: true,
    partialFilterExpression: { nombreArchivoClave: { $type: "string" } },
  }
);

module.exports = model("tasaImportacion", tasaImportacionSchema);
