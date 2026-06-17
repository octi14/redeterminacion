const { Schema, model } = require("mongoose");

const experimentalUserRoleSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    roleKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    assignedBy: {
      id: { type: Schema.Types.ObjectId, ref: "users" },
      username: String,
    },
  },
  {
    collection: "experimental_user_roles",
    timestamps: true,
  }
);

experimentalUserRoleSchema.index({ userId: 1, roleKey: 1 }, { unique: true });

module.exports = model("ExperimentalUserRole", experimentalUserRoleSchema);
