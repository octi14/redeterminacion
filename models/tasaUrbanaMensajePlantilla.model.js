const { Schema, model } = require("mongoose");

/** Texto de mensaje personalizado con los números reemplazados por un marcador. */
const tasaUrbanaMensajePlantillaSchema = new Schema(
  {
    hash: { type: String, required: true, unique: true },
    texto: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "tasaurbanamensajeplantillas",
  }
);

module.exports = model("tasaUrbanaMensajePlantilla", tasaUrbanaMensajePlantillaSchema);
