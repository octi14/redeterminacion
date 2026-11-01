const { Schema, model } = require("mongoose");

/** Una cuenta por partida; las boletas de todos los períodos apuntan acá. */
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

tasaUrbanaCuentaSchema.index({ partida: 1 }, { unique: true });

module.exports = model("tasaUrbanaCuenta", tasaUrbanaCuentaSchema);
