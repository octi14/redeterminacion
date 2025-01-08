const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    actionType: { type: String, required: true },
    actionResult: { type: String, required: true },
    sessionId: { type: String, required: true },
    visitedUrl: { type: String, required: true },
    deviceInfo: {
        deviceType: { type: String, required: true },
        os: { type: String, required: true },
        resolution: { type: String, required: true },
        browserInfo: { type: String, required: true },
    },
    timestamp: { type: Date, default: Date.now },
});

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

module.exports = UserActivity;