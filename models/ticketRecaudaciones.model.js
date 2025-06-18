const { model, Schema } = require("mongoose");

const ticketRecaudacionesSchema = new Schema(
  {
    current: {
      type: Number,
    },
  },
);

module.exports = model("ticketRecaudaciones", ticketRecaudacionesSchema);
