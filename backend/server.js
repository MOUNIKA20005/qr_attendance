const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB first
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    // Require routes after DB connection
    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/attendance", require("./routes/attendance"));
    app.use("/api/session", require("./routes/session"));
    app.use("/api/qr", require("./routes/qr"));
    app.use("/api/device", require("./routes/device"));
    app.use("/api/leave", require("./routes/leave"));
    app.use("/api/report", require("./routes/report"));
    app.use("/api/analytics", require("./routes/analytics"));
    app.use("/api/admin", require("./routes/admin"));
    app.use("/api/admin-analytics", require("./routes/adminAnalytics"));
    app.use("/api/test", require("./routes/test"));

    const PORT = process.env.PORT || 5000;
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    io.on("connection", (socket) => {
      console.log("🟢 Client connected:", socket.id);
      socket.on("disconnect", () => {
        console.log("🔴 Client disconnected:", socket.id);
      });
    });

    // Store io instance in app for routes to use
    app.set("io", io);

    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });
