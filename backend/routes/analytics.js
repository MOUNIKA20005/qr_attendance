const express = require("express");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { Parser } = require("json2csv");

const router = express.Router();

/**
 * KPI CARDS
 * GET /api/analytics/kpi
 */
router.get("/kpi", auth, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalTeachers = await User.countDocuments({ role: "teacher" });
    const totalAttendance = await Attendance.countDocuments();

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const todayPresent = await Attendance.countDocuments({
      status: "Present",
      date: { $gte: start, $lte: end },
    });

    res.json({
      totalStudents,
      totalTeachers,
      totalAttendance,
      todayPresent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "KPI fetch failed" });
  }
});

/**
 * SUBJECT-WISE ANALYTICS
 * GET /api/analytics/subject-wise
 */
router.get("/subject-wise", auth, async (req, res) => {
  try {
    const { subject, from, to } = req.query;
    const match = {};

    if (subject) match.subject = { $regex: subject, $options: "i" };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }

    const data = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$subject",
          total: { $sum: 1 },
        },
      },
    ]);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Subject analytics failed" });
  }
});

/**
 * DAILY ANALYTICS
 * GET /api/analytics/daily
 */
router.get("/daily", auth, async (req, res) => {
  try {
    const { subject, from, to } = req.query;
    const match = {};

    if (subject) match.subject = { $regex: subject, $options: "i" };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }

    const data = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Daily analytics failed" });
  }
});

/**
 * EXPORT ANALYTICS CSV
 * GET /api/analytics/export
 */
router.get("/export", auth, async (req, res) => {
  try {
    const { subject, from, to } = req.query;
    const match = {};

    if (subject) match.subject = subject;
    if (from && to) {
      match.date = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    const records = await Attendance.find(match).populate(
      "studentId",
      "name email"
    );

    // Map safely for CSV
    const data = records.map((r) => {
      const date = r.date instanceof Date ? r.date : new Date(r.date);
      return {
        Name: r.studentId?.name || "N/A",
        Email: r.studentId?.email || "N/A",
        Subject: r.subject,
        Date: isNaN(date.getTime()) ? "Invalid Date" : date.toISOString().split("T")[0],
        Status: r.status,
      };
    });

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("attendance-analytics.csv");
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "CSV export failed" });
  }
});
/**
 * HEATMAP ANALYTICS
 * GET /api/analytics/heatmap
 */
router.get("/heatmap", auth, async (req, res) => {
  try {
    const { subject, from, to } = req.query;
    const match = {};
    if (subject) match.subject = subject;
    if (from && to) {
      match.date = { $gte: new Date(from), $lte: new Date(to) };
    }

    // Get all attendance grouped by date & subject
    const data = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, subject: "$subject" },
          present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Transform data into table format
    const dates = [...new Set(data.map((d) => d._id.date))];
    const subjects = [...new Set(data.map((d) => d._id.subject))];

    const heatmap = dates.map((date) => {
      return {
        date,
        subjects: subjects.map((s) => {
          const record = data.find((d) => d._id.date === date && d._id.subject === s);
          return {
            subject: s,
            present: record?.present || 0,
            total: record?.total || 0,
            percentage: record ? Math.round((record.present / record.total) * 100) : 0,
          };
        }),
      };
    });

    res.json(heatmap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Heatmap analytics failed" });
  }
});


module.exports = router;
