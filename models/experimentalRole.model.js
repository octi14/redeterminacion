const { Schema, model } = require("mongoose");

const experimentalRoleSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    permissions: [{
      type: String,
      required: true,
      trim: true,
    }],
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: "experimental_roles",
    timestamps: true,
  }
);

module.exports = model("ExperimentalRole", experimentalRoleSchema);
