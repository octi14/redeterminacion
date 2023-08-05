const { model, Schema } = require("mongoose");

const ticketSchema = new Schema(
  {
    current: {
      type: Number,
    },
  },
);

module.exports = model("ticket", ticketSchema);
