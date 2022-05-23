const { Schema, model } = require("mongoose");
const Certificado = require("./certificado.model");

const ObraSchema = new Schema(
  {
    expediente: {
      type: String,
    },
    objeto: {
      type: String,
    },
    presup_oficial: {
      type: Number,
    },
    adjudicado: {
      type: String,
    },
    proveedor: {
      type: String,
    },
    cotizacion:{
      type: Number,
    },
    items: [
      {
        _id: false,
        item: String,
        monto: Number,
      },
    ],
    certificados: [
      {
        type: Schema.Types.ObjectId,
        ref: Certificado,
      },
    ],
    garantia_contrato: {
      type: Number,
    },
    adjudicacion: {
      type: Number,
    },
    contrato: {
      type: String,
    },
    fecha_contrato: {
      type: Date,
    },
    ordenanza: {
      type: String,
    },
    decreto: {
      type: String,
    },
    plazo_obra: {
      type: String,
    },
    anticipo_finan: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("obras", ObraSchema);
