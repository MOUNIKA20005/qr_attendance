const FraudLog = require("../models/FraudLog");

// Simple in-memory per-user rate limiter: 5 seconds
const lastRequest = new Map();

module.exports = async (req, res, next) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ message: "No user" });

    const now = Date.now();
    const last = lastRequest.get(userId) || 0;
    if (now - last < 5000) {
      // log rate-limited attempt
      try {
        await FraudLog.create({ studentId: userId, type: "rate_limited", details: "Too many requests" , ip: req.ip });
      } catch (e) {}
      return res.status(429).json({ message: "Too many requests - slow down" });
    }

    lastRequest.set(userId, now);
    next();
  } catch (err) {
    next(err);
  }
};
