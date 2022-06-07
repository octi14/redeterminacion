const { Schema, model } = require("mongoose");
const Categoria = require("./categoria.model")

const IndiceSchema = new Schema(
  {
    año: {
      type: Number,
    },
    mes: {
      type: Number,
    },
    categoria: {
      type: Schema.Types.ObjectId,
      ref: Categoria,
    },
    valor: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("indice", IndiceSchema);
