const { Schema, model } = require("mongoose");

const tasaUrbanaPartidaSchema = new Schema(
  {
    importBatchId: { type: Schema.Types.ObjectId, required: true, index: true },
    partida: { type: String, required: true },
    codigosPago: {
      pagoMisCuentas: String,
      redLink: String,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "tasaurbanapartidas",
  }
);

tasaUrbanaPartidaSchema.index({ importBatchId: 1, partida: 1 }, { unique: true });

module.exports = model("tasaUrbanaPartida", tasaUrbanaPartidaSchema);
