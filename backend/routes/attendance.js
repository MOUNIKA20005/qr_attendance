const express = require("express");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Session = require("../models/Session");
const FraudLog = require("../models/FraudLog");
const auth = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const { verifySignedPayload } = require("../utils/qrVerify");
const { haversineDistance } = require("../utils/geo");

const router = express.Router();

/* ================= STUDENT: MARK ATTENDANCE ================= */
router.post("/mark", auth, rateLimiter, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can mark attendance" });
    }

    // Expect the frontend to send `signedQr` (base64.payload + .signature)
    const signedQr = req.body.signedQr || req.body.qr || req.body.rawQr;
    const deviceId = req.body.deviceId;
    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);
    const secretCode = req.body.secretCode;

    if (!signedQr) {
      await FraudLog.create({ studentId: req.user._id, type: "invalid_qr", details: "no_qr", ip: req.ip });
      return res.status(400).json({ message: "Missing QR payload" });
    }

    const payload = verifySignedPayload(signedQr);
    if (!payload) {
      await FraudLog.create({ studentId: req.user._id, type: "invalid_qr", details: "signature_mismatch", ip: req.ip });
      return res.status(400).json({ message: "Invalid QR" });
    }

    const { classId, sessionId, timestamp } = payload;
    if (!sessionId || !timestamp) {
      await FraudLog.create({ studentId: req.user._id, sessionId, classId, type: "invalid_qr", details: "missing_fields", ip: req.ip });
      return res.status(400).json({ message: "Invalid QR contents" });
    }

    // Strict timestamp validation - QR rotates every 30s; allow small clock drift
    const allowedSeconds = parseInt(process.env.QR_MAX_AGE_SECONDS || "45", 10);
    const issuedAt = Number(timestamp);
    if (isNaN(issuedAt) || Math.abs(Date.now() - issuedAt) > allowedSeconds * 1000) {
      await FraudLog.create({ studentId: req.user._id, sessionId, classId, type: "expired_qr", details: "timestamp_out_of_range", ip: req.ip });
      return res.status(400).json({ message: "QR expired or replayed" });
    }

    // Check session exists and is active
    const session = await Session.findOne({ sessionId });
    if (!session || !session.active) {
      await FraudLog.create({ studentId: req.user._id, sessionId, classId, type: "expired_qr", details: "session_inactive", ip: req.ip });
      return res.status(400).json({ message: "Session is not active" });
    }

    // Verify secret code
    if (!secretCode || session.secretCode !== secretCode) {
      await FraudLog.create({ studentId: req.user._id, sessionId, classId, type: "invalid_secret", details: "wrong_secret_code", ip: req.ip });
      return res.status(403).json({ message: "Invalid secret code" });
    }

    // Device binding
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: "User not found" });
    if (!deviceId || !user.registeredDeviceId || user.registeredDeviceId !== deviceId) {
      await FraudLog.create({ studentId: req.user._id, sessionId, classId, type: "device_mismatch", details: `device:${deviceId}`, ip: req.ip });
      return res.status(403).json({ message: "Device not registered or mismatch" });
    }

    // Require location and validate within 50 meters of session location
    if (session.location && (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng))) {
      await FraudLog.create({ studentId: req.user._id, sessionId, classId, type: "location_mismatch", details: "no_location_in_request", ip: req.ip });
      return res.status(400).json({ message: "Location required" });
    }

    if (session.location) {
      const dist = haversineDistance(lat, lng, session.location.lat, session.location.lng);
      if (dist > 50) {
        await FraudLog.create({ studentId: req.user._id, sessionId, classId, type: "location_mismatch", details: `distance_m=${Math.round(dist)}`, ip: req.ip });
        return res.status(403).json({ message: "You are not within the classroom geofence" });
      }
    }

    // Prevent duplicates for the same session
    const existing = await Attendance.findOne({ studentId: req.user._id, sessionId });
    if (existing) {
      await FraudLog.create({ studentId: req.user._id, sessionId, classId, type: "duplicate_attempt", details: "already_marked", ip: req.ip });
      return res.status(400).json({ message: "Attendance already recorded for this session" });
    }

    // Save attendance
    const attendance = await Attendance.create({
      studentId: req.user._id,
      subject: payload.subject || session.classId || payload.classId,
      classId: classId || session.classId,
      sessionId,
      date: new Date(),
      status: "Present",
      deviceId,
      lat,
      lng,
      ip: req.ip,
      rawQr: signedQr
    });

    // Emit live update
    const io = req.app.get("io");
    if (io && session.classId) io.to(session.classId).emit("attendanceUpdate", { studentId: req.user._id, sessionId, status: "Present" });

    res.json({ message: "Attendance marked successfully" });
  } catch (err) {
    console.error("❌ Mark attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= STUDENT: VIEW OWN ATTENDANCE ================= */
router.get("/my", auth, async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.user._id }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= STUDENT: ATTENDANCE SUMMARY ================= */
router.get("/my/summary", auth, async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.user._id });

    const summary = {};
    records.forEach((r) => {
      if (!summary[r.subject]) summary[r.subject] = { total: 0, present: 0 };
      summary[r.subject].total++;
      if (r.status === "Present") summary[r.subject].present++;
    });

    const result = Object.keys(summary).map((subject) => ({
      subject,
      percentage: Math.round(
        (summary[subject].present / summary[subject].total) * 100
      )
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= TEACHER: SUBJECT REPORT ================= */
router.get("/report/:subject", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view reports" });
    }

    const subject = req.params.subject;
    const records = await Attendance.find({ subject }).populate("studentId", "name email").sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
