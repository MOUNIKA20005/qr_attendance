const express = require("express");
const router = express.Router();
const Leave = require("../models/Leave");
const auth = require("../middleware/auth");

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT → SUBMIT LEAVE
POST /api/leave/request
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
router.post("/request", auth, async (req, res) => {
  console.log("REQ.USER:", req.user);
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can request leave" });
    }

    const { date, reason } = req.body;

    if (!date || !reason) {
      return res.status(400).json({ message: "Date and reason are required" });
    }

    // ❗ Prevent duplicate leave for same date
    const existing = await Leave.findOne({
      studentId: req.user.id,
      date,
    });

    if (existing) {
      return res.status(400).json({ message: "Leave already requested for this date" });
    }

    const leave = await Leave.create({
      studentId: req.user.id,
      date,
      reason,
    });

    res.status(201).json({
      message: "Leave request submitted",
      leave,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT → VIEW OWN LEAVES
GET /api/leave/my
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
router.get("/my", auth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Access denied" });
    }

    const leaves = await Leave.find({ studentId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEACHER → VIEW ALL LEAVES
GET /api/leave/all
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
router.get("/all", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view all leaves" });
    }

    const leaves = await Leave.find()
      .populate("studentId", "name email")
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEACHER → APPROVE / REJECT
PATCH /api/leave/:id/status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
router.patch("/:id/status", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can update leave status" });
    }

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    leave.status = status.charAt(0).toUpperCase() + status.slice(1);
    await leave.save();

    // Notify the student via socket
    const io = req.app.get("io");
    io.to(leave.studentId.toString()).emit("leaveStatusUpdate", {
      status: leave.status,
      date: leave.date
    });

    res.json({ message: `Leave ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
