const express = require("express");
const crypto = require("crypto");
const Session = require("../models/Session");
const auth = require("../middleware/auth");

const router = express.Router();

// Create session (teacher only)
router.post("/create", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") return res.status(403).json({ message: "Only teachers/admins can create sessions" });

    const { classId, location, secretCode } = req.body;
    if (!classId) return res.status(400).json({ message: "classId required" });
    if (!secretCode) return res.status(400).json({ message: "secretCode required" });

    const sessionId = crypto.randomBytes(8).toString("hex");

    const session = await Session.create({ sessionId, classId, teacherId: req.user._id, location, secretCode, active: true, startAt: new Date() });
    res.json({ message: "Session created", sessionId: session.sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Close session
router.post("/close", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") return res.status(403).json({ message: "Only teachers/admins can close sessions" });
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ message: "Session not found" });

    session.active = false;
    session.endAt = new Date();
    await session.save();

    res.json({ message: "Session closed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Generate signed QR for an active session
router.post("/generate-qr", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") return res.status(403).json({ message: "Only teachers/admins can generate QR" });
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });

    const session = await Session.findOne({ sessionId });
    if (!session || !session.active) return res.status(400).json({ message: "Invalid or inactive session" });

    const payload = {
      classId: session.classId,
      sessionId: session.sessionId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(6).toString("hex")
    };

    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const sig = crypto.createHmac("sha256", process.env.QR_SECRET || "qr_secret_change_me").update(b64).digest("hex");
    const signed = `${b64}.${sig}`;

    res.json({ signedQr: signed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
