const { model, Schema } = require("mongoose");

const userSchema = new Schema(
  {
    username: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    admin: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("users", userSchema);
