const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// Register/Bind a device for student
router.post("/register", auth, async (req, res) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ message: "Only students can register devices" });
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ message: "deviceId required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.registeredDeviceId = deviceId;
    await user.save();

    res.json({ message: "Device registered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
