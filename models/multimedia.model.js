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
      type: Schema.Types.ObjectId,
      ref: 'MultimediaCategoria',
    }
  },
  {
    timestamps: true,
  }
);

module.exports = model("multimedia", MultimediaSchema);
