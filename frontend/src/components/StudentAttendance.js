import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import axios from "axios";
import { io } from "socket.io-client";
import "./StudentAttendance.css";

const socket = io("http://localhost:5000");

const StudentAttendance = ({ user }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanningRef = useRef(true);

  const [message, setMessage] = useState("Enter secret code and device ID, then scan QR…");
  const [secretCode, setSecretCode] = useState("");
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    if (user?._id) socket.emit("joinRoom", user._id);

    socket.on("attendanceReminder", (data) => {
      setMessage(`🔔 ${data.message}`);
    });

    return () => {
      socket.off("attendanceReminder");
    };
  }, [user]);

  const startCamera = async () => {
    if (!secretCode || !deviceId) {
      setMessage("❌ Enter secret code and device ID first");
      return;
    }

    try {
      scanningRef.current = true;
      setMessage("Scanning QR…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => requestAnimationFrame(scanQR);
    } catch {
      setMessage("❌ Camera permission denied");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
  };

  const scanQR = () => {
    if (!scanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code?.data) {
        scanningRef.current = false;
        stopCamera();
        markAttendance(code.data);
        return;
      }
    }
    requestAnimationFrame(scanQR);
  };

  const markAttendance = async (qrData) => {
    let lat = null, lng = null;
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 }));
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      setMessage("❌ Location access required");
      scanningRef.current = true;
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/attendance/mark",
        { signedQr: qrData, deviceId, lat, lng, secretCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(`✅ ${res.data.message}`);
    } catch (err) {
      setMessage("❌ Attendance failed: " + (err.response?.data?.message || "Error"));
      scanningRef.current = true;
    }
  };

  return (
    <div className="student-attendance">
      <h2>Mark Attendance</h2>

      <div className="input-group">
        <input
          type="text"
          placeholder="Secret Code (announced by teacher)"
          value={secretCode}
          onChange={(e) => setSecretCode(e.target.value)}
        />
        <input
          type="text"
          placeholder="Device ID"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
        />
      </div>

      <button onClick={startCamera} disabled={!secretCode || !deviceId}>
        Start Camera & Scan QR
      </button>

      <div className="scanner">
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      <p className="message">{message}</p>
    </div>
  );
};

export default StudentAttendance;
