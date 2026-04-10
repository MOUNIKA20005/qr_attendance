const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  role: {
    type: String,
    enum: ["student", "teacher", "admin"],
    required: true   // ❗ DO NOT DEFAULT HERE
  },
  registeredDeviceId: { type: String, default: null }
});

module.exports = mongoose.model("User", userSchema);