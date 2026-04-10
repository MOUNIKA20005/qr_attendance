const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subject: { type: String },
  classId: { type: String },
  sessionId: { type: String },
  date: { type: Date, default: Date.now },
  status: { type: String, default: "Present" },
  deviceId: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  ip: { type: String },
  rawQr: { type: String }
});

module.exports = mongoose.model("Attendance", AttendanceSchema);