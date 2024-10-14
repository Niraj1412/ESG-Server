// server/models/UserPreference.js
const mongoose = require('mongoose');

const UserPreferenceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  selectedMetrics: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const UserPreference = mongoose.model('UserPreference', UserPreferenceSchema);

module.exports = UserPreference;
