const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  classId: { type: String },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  secretCode: { type: String },
  active: { type: Boolean, default: true },
  startAt: { type: Date, default: Date.now },
  endAt: { type: Date }
});

module.exports = mongoose.model("Session", SessionSchema);
