const { model, Schema } = require("mongoose");

const userActivitySchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actionType: { type: String, required: true },
    actionResult: { type: String },
    sessionId: { type: String },
    visitedUrl: { type: String },
    deviceInfo: {
      deviceType: { type: String },
      os: { type: String },
      resolution: { type: String },
      browserInfo: { type: String }
    },
    timestamp: { type: Date, default: Date.now }
  });

module.exports = model('UserActivity', userActivitySchema);