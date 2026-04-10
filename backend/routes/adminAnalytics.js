const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const User = require("../models/User");

router.get("/kpi", async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });

    const today = new Date().toISOString().split("T")[0];

    const todayAttendance = await Attendance.countDocuments({
      date: today,
      status: "present",
    });

    const totalToday = await Attendance.countDocuments({ date: today });

    const attendancePercent = totalToday
      ? Math.round((todayAttendance / totalToday) * 100)
      : 0;

    const subjectWise = await Attendance.aggregate([
      { $match: { status: "absent" } },
      { $group: { _id: "$subject", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    res.json({
      totalStudents,
      todayAttendance,
      attendancePercent,
      mostAbsentSubject: subjectWise[0]?._id || "N/A",
    });
  } catch (err) {
    res.status(500).json({ error: "KPI fetch failed" });
  }
});

module.exports = router;
