const { Schema, model } = require("mongoose");

const itemSchema = new Schema(
  {
    name: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("items", itemSchema);
