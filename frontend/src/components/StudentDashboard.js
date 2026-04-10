import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import axios from "axios";
import { io } from "socket.io-client";
import "./StudentDashboard.css";

const socket = io("http://localhost:5000");

const StudentDashboard = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanningRef = useRef(true);

  const [message, setMessage] = useState("Scanning QR…");
  const [records, setRecords] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [summary, setSummary] = useState([]);
  const [showRecords, setShowRecords] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [qrExpiresAt, setQrExpiresAt] = useState(null);
  const [qrRemaining, setQrRemaining] = useState(0);
  const qrTickRef = useRef(null);

  // ---------------- LEAVE STATE ----------------
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    // ensure deviceId exists locally
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("deviceId", id);
    }
    setDeviceId(id);

    // Optionally assume registered if server set it previously (we can ask server later)
    // start camera
    startCamera();
    return stopCamera;
  }, []);

  const startCamera = async () => {
    try {
      scanningRef.current = true;

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
        console.log("QR scanned:", code.data);
        scanningRef.current = false;
        stopCamera();

        // Try decode signed QR locally to show countdown/progress
        try {
          const parts = code.data.split(".");
          if (parts.length === 2) {
            const b64 = parts[0];
            const payload = JSON.parse(atob(b64));
            if (payload && payload.timestamp) {
              const expires = Number(payload.timestamp) + 30 * 1000; // 30s rotation window
              setQrExpiresAt(expires);
              setQrRemaining(Math.max(0, Math.ceil((expires - Date.now()) / 1000)));
              if (qrTickRef.current) clearInterval(qrTickRef.current);
              qrTickRef.current = setInterval(() => {
                const rem = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
                setQrRemaining(rem);
              }, 250);
            }
          }
        } catch (e) {
          // silently ignore decode errors
        }

        markAttendance(code.data);
        return;
      }
    }

    requestAnimationFrame(scanQR);
  };

  const markAttendance = async (qrData) => {
    // qrData is expected to be the signed string from teacher: base64.payload.signature
    const token = localStorage.getItem("token");
    if (!token) return resetScanner("⚠ Login required");

    // ensure deviceId exists (register locally if needed)
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("deviceId", deviceId);
    }

    // try to get current location
    let coords = { lat: null, lng: null };
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 }));
      coords.lat = pos.coords.latitude;
      coords.lng = pos.coords.longitude;
    } catch (e) {
      // location may be required by server; let server respond
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/attendance/mark",
        { signedQr: qrData, deviceId, lat: coords.lat, lng: coords.lng },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(`✅ ${res.data.message}`);
      // clear local QR countdown on success
      setQrExpiresAt(null);
      setQrRemaining(0);
      if (qrTickRef.current) { clearInterval(qrTickRef.current); qrTickRef.current = null; }
    } catch (err) {
      const msg = err.response?.data?.message || "❌ Attendance failed";
      resetScanner(msg);
    }
  };

  const resetScanner = (msg) => {
    setMessage(msg);
    scanningRef.current = true;
    // clear QR countdown
    setQrExpiresAt(null);
    setQrRemaining(0);
    if (qrTickRef.current) { clearInterval(qrTickRef.current); qrTickRef.current = null; }
    startCamera();
  };

  useEffect(() => {
    return () => {
      if (qrTickRef.current) clearInterval(qrTickRef.current);
    };
  }, []);

  const fetchRecords = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("http://localhost:5000/api/attendance/my", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRecords(res.data);
    setShowRecords(true);
    setShowSummary(false);
  };

  const fetchSummary = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("http://localhost:5000/api/attendance/my/summary", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSummary(res.data);
    setShowSummary(true);
    setShowRecords(false);
  };

  // ---------------- LEAVE STATUS UPDATE ----------------
  useEffect(() => {
    socket.on("leaveStatusUpdate", (data) => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const studentId = JSON.parse(atob(token.split(".")[1]))._id;
      if (data.studentId === studentId) {
        console.log("Your leave status updated:", data);
        alert(`Leave status updated: ${data.status} for ${data.date}`);
      }
    });

    return () => {
      socket.off("leaveStatusUpdate");
    };
  }, []);

  // ---------------- SUBMIT LEAVE REQUEST ----------------
  const submitLeaveRequest = async () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("⚠ You must be logged in");

    if (!leaveDate || !leaveReason) return alert("⚠ Please enter date and reason");

    try {
      const res = await axios.post(
        "http://localhost:5000/api/leave/request",
        { date: leaveDate, reason: leaveReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Leave submitted:", res.data);
      alert(res.data.message);
      setLeaveDate("");
      setLeaveReason("");
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert(err.response?.data?.message || "Server error");
    }
  };

  // ---------------- DEVICE REGISTRATION ----------------
  const registerDevice = async () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Login required to register device");
    if (!deviceId) return alert("No deviceId available");

    try {
      const res = await axios.post(
        "http://localhost:5000/api/device/register",
        { deviceId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDeviceRegistered(true);
      alert(res.data.message || "Device registered");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Device registration failed");
    }
  };

  return (
    <div className="student-dashboard-container">
      <h2>Student Dashboard</h2>
      <p className="scan-message">{message}</p>

      <video ref={videoRef} autoPlay muted playsInline className="video-feed" />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* QR countdown/progress when a QR is scanned */}
      {qrExpiresAt && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 8, background: "#eee", borderRadius: 4, overflow: "hidden", width: 300 }}>
            <div
              style={{
                height: "100%",
                background: "#6c6cff",
                width: `${((30 - (qrRemaining || 0)) / 30) * 100}%`,
                transition: "width 0.25s linear"
              }}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 14 }}> {qrRemaining > 0 ? `QR expires in ${qrRemaining}s` : "QR expired"} </div>
        </div>
      )}

      <div className="action-buttons">
        <button onClick={fetchRecords}>📋 Attendance Records</button>
        <button onClick={fetchSummary}>📊 Attendance Percentage</button>
      </div>

      {/* Device registration UI */}
      <div style={{ marginTop: 12 }}>
        <strong>Device ID:</strong> <span style={{ fontFamily: "monospace" }}>{deviceId || "-"}</span>
        <br />
        <button onClick={registerDevice} style={{ marginTop: 8 }}>
          {deviceRegistered ? "Device Registered" : "Register Device"}
        </button>
      </div>

      {/* Records Table */}
      {showRecords && (
        <div className="table-wrapper">
          <h3>Attendance Records</h3>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <td>{r.subject}</td>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Attendance Summary */}
      {showSummary && (
        <div className="progress-section">
          <h3>Attendance Progress</h3>
          {summary.map((s, i) => {
            let barClass = "green";
            if (s.percentage < 60) barClass = "red";
            else if (s.percentage < 75) barClass = "yellow";

            return (
              <div className="progress-card" key={i}>
                <div className="progress-header">
                  <span>{s.subject}</span>
                  <span>{s.percentage}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className={`progress-bar-fill ${barClass}`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- LEAVE SECTION ---------------- */}
      <div className="leave-section">
        <h3>Submit Leave Request</h3>
        <input
          type="date"
          value={leaveDate}
          onChange={(e) => setLeaveDate(e.target.value)}
        />
        <input
          type="text"
          placeholder="Reason for leave"
          value={leaveReason}
          onChange={(e) => setLeaveReason(e.target.value)}
        />
        <button onClick={submitLeaveRequest}>Submit Leave</button>
      </div>
    </div>
  );
};

export default StudentDashboard;
