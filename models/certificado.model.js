const { Schema, model } = require("mongoose");
const Obra = require("./obra.model");

const CertificadoSchema = new Schema(
  {
    obra: {
      type: Schema.Types.ObjectId,
      ref: Obra,
    },
    fecha: {
      type: Date,
    },
    factura: {
      type: String,
    },
    op: {
      type: Number,
    },
    fecha_cancelacion:{
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("certificado", CertificadoSchema);
