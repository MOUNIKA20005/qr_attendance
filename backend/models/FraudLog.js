const mongoose = require("mongoose");

const FraudLogSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sessionId: { type: String },
  classId: { type: String },
  type: {
    type: String,
    enum: [
      "expired_qr",
      "invalid_qr",
      "invalid_secret",
      "device_mismatch",
      "location_mismatch",
      "duplicate_attempt",
      "rate_limited"
    ],
  },
  details: { type: String },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = require("mongoose").model("FraudLog", FraudLogSchema);
