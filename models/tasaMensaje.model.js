const { Schema, model } = require("mongoose");

const tasaMensajeSchema = new Schema(
  {
    hash: { type: String, required: true, unique: true },
    texto: { type: String, required: true },
  },
  { timestamps: false, versionKey: false }
);

module.exports = model("tasaMensaje", tasaMensajeSchema);
