const { Schema, model } = require("mongoose");

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
    items:[
      {
        type: String,
      },
    ],
    garantia_contrato: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("obras", ObraSchema);
