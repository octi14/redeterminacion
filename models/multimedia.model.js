const { Schema, model } = require("mongoose");

const MultimediaSchema = new Schema(
  {
    nombre: {
      type: String,
    },
    link: {
      type: String,
    },
    categoria: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = model("multimedia", MultimediaSchema);
