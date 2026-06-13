const { Schema, model } = require("mongoose");

const tasaObjetoSchema = new Schema(
  {
    tipoTasa: { type: String, required: true },
    importacionId: { type: Schema.Types.ObjectId, ref: "tasaImportacion", required: true },
    objetoClave: { type: String, required: true },
    contribuyente: {
      nombre: String,
      domicilio: String,
      localidad: String,
      codigoPostal: String,
    },
    objeto: {
      dominio: String,
      categoria: String,
      marca: String,
      modelo: String,
      anioModelo: Number,
      partida: String,
      catastro: String,
      parcela: String,
      metrosConstruidos: Number,
      zona: String,
    },
    mensajeDeuda: String,
    mensajeBoletaId: { type: Schema.Types.ObjectId, ref: "tasaMensaje" },
    codigosPago: {
      pagoMisCuentas: String,
      redLink: String,
    },
  },
  { timestamps: false, versionKey: false }
);

tasaObjetoSchema.index({ importacionId: 1, objetoClave: 1 }, { unique: true });

module.exports = model("tasaObjeto", tasaObjetoSchema);
