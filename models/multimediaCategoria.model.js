const { Schema, model } = require("mongoose");

const MultimediaCategoriaSchema = new Schema(
  {
    nombre: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("multimediaCategoria", MultimediaCategoriaSchema);
