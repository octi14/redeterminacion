const { Schema, model } = require("mongoose");

const CategoriaSchema = new Schema(
  {
    nombre: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("categoria", CategoriaSchema);
