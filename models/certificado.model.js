const { Schema, model } = require("mongoose");
const Obra = require("./obra.model");

const CertificadoSchema = new Schema(
  {
    obra: {
      type: Schema.Types.ObjectId,
      ref: 'Obra',
    },
    items: [
      {
        contratado: String,
        anticipo: Number,
        item: String,
        avance: Number,
        saldo: Number,
      },
    ],
    redeterminado: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("certificado", CertificadoSchema);
