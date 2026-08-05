const { Schema, model } = require("mongoose");

const userRoleSchema = new Schema(
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
    collection: "user_roles",
    timestamps: true,
  }
);

userRoleSchema.index({ userId: 1, roleKey: 1 }, { unique: true });

module.exports = model("UserRole", userRoleSchema);
