const { Schema, model } = require("mongoose");

const ObraSchema = new Schema(
  {
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    budget: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("obras", ObraSchema);
