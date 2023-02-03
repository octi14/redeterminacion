const { Schema, model } = require("mongoose");
const Obra = require("./obra.model");
const Certificado = require("./certificado.model");

const RedeterminacionSchema = new Schema(
  {
    obra: {
      type: Schema.Types.ObjectId,
      ref: Obra,
    },
    certificado: {
      type: Schema.Types.ObjectId,
      ref: Certificado,
    },
    items: [
      {
        item: String,
        saldo: Number,
        materiales: Number,
        generales: Number,
        manoObra: Number,
        equipos: Number,
        uvi: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = model("redeterminacion", RedeterminacionSchema);
