const { Schema, model } = require("mongoose");

/** Versión de los datos de una partida; varias boletas (y tiradas) la comparten mientras no cambie. */
const tasaUrbanaCuentaSchema = new Schema(
  {
    partida: { type: String, required: true },
    hash: { type: String, required: true },
    contribuyente: {
      nombre: String,
      domicilio: String,
      localidad: String,
      codigoPostal: String,
    },
    objeto: {
      catastro: String,
      parcela: String,
      metrosConstruidos: Number,
      zona: String,
    },
    codigosPago: {
      pagoMisCuentas: String,
      redLink: String,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "tasaurbanacuentas",
  }
);

tasaUrbanaCuentaSchema.index({ partida: 1, hash: 1 }, { unique: true });

module.exports = model("tasaUrbanaCuenta", tasaUrbanaCuentaSchema);
