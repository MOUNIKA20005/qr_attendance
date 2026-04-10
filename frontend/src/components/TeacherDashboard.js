import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";
import { io } from "socket.io-client";
import "./TeacherDashboard.css";
import TeacherLeave from "./TeacherLeave";

const socket = io("http://localhost:5000");

export default function TeacherDashboard() {
  const [subject, setSubject] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [qrExpiresAt, setQrExpiresAt] = useState(null);
  const [qrRemaining, setQrRemaining] = useState(0);
  const [report, setReport] = useState([]);
  const [message, setMessage] = useState("");
  const [percentage, setPercentage] = useState(null);
  const [liveCount, setLiveCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [activeTab, setActiveTab] = useState("session");
  const [secretCode, setSecretCode] = useState("");

  // ---------------- CREATE SESSION ----------------
  const createSession = async () => {
    if (!subject) return alert("Enter subject/classId first");
    if (!secretCode) return alert("Enter secret code for this session");
    const token = localStorage.getItem("token");
    if (!token) return setMessage("⚠ Please login as a teacher first");

    // try to obtain teacher location for geofence
    let location = null;
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 }));
      location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
      // location optional but recommended
    }

    try {
      const res = await axios.post("http://localhost:5000/api/session/create", { classId: subject, location, secretCode }, { headers: { Authorization: `Bearer ${token}` } });
      setSessionId(res.data.sessionId);
      setMessage("✅ Session created. You can now generate rotating QR.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create session");
    }
  };

  // ---------------- CLOSE SESSION ----------------
  const closeSession = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setMessage("⚠ Please login as a teacher first");
    if (!sessionId) return setMessage("⚠ No active session to close");

    try {
      await axios.post("http://localhost:5000/api/session/close", { sessionId }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage("✅ Session closed");
      setSessionId("");
      setQrValue("");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to close session");
    }
  };

  // ---------------- GENERATE QR (server-signed) ----------------
  const generateQR = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setMessage("⚠ Please login as a teacher first");
    if (!sessionId) return setMessage("⚠ No session. Create one first.");

    try {
      const res = await axios.post("http://localhost:5000/api/session/generate-qr", { sessionId }, { headers: { Authorization: `Bearer ${token}` } });
      setQrValue(res.data.signedQr);
      setMessage("✅ QR generated! Students can scan now.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to generate QR");
    }
  };

  // rotate QR every 30s when session active and show countdown
  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;

    const doGenerate = async () => {
      await generateQR();
      if (mounted) setQrExpiresAt(Date.now() + 30 * 1000);
    };

    doGenerate();
    const genInterval = setInterval(() => doGenerate(), 30 * 1000);

    const tick = setInterval(() => {
      if (!mounted) return;
      if (!qrExpiresAt) return setQrRemaining(0);
      const rem = Math.max(0, Math.ceil((qrExpiresAt - Date.now()) / 1000));
      setQrRemaining(rem);
    }, 250);

    return () => {
      mounted = false;
      clearInterval(genInterval);
      clearInterval(tick);
    };
  }, [sessionId, qrExpiresAt]);

  // ---------------- FETCH REPORT ----------------
  const fetchReport = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setMessage("⚠ Please login as a teacher first");
    if (!subject) return alert("Enter subject to fetch report");

    try {
      const res = await axios.get(
        `http://localhost:5000/api/attendance/report/${subject}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReport(res.data);

      if (res.data.length > 0) {
        const presentCount = res.data.filter((r) => r.status === "Present").length;
        setPercentage(Math.round((presentCount / res.data.length) * 100));
        setLiveCount(presentCount); // set live count
      } else {
        setPercentage(null);
        setLiveCount(0);
      }

      setMessage(`✅ Report fetched successfully for ${subject}`);
    } catch (err) {
      console.error(err);
      setMessage(
        `❌ Failed to fetch report: ${err.response?.data?.message || err.message}`
      );
      setReport([]);
      setPercentage(null);
      setLiveCount(0);
    }
  };

  // ---------------- LIVE ATTENDANCE ----------------
  useEffect(() => {
    if (subject) {
      socket.emit("joinSubject", subject);

      socket.on("attendanceUpdate", () => {
        console.log("Live attendance updated");
        setPulse(true);
        fetchReport(); // refresh report

        setTimeout(() => setPulse(false), 800); // animation reset
      });

      return () => socket.off("attendanceUpdate");
    }
  }, [subject]);

  return (
    <div className="teacher-dashboard-container">
      <h2>Teacher Dashboard</h2>

      <div className="tab-buttons">
        <button onClick={() => setActiveTab("session")} className={activeTab === "session" ? "active" : ""}>
          Session Management
        </button>
        <button onClick={() => setActiveTab("leave")} className={activeTab === "leave" ? "active" : ""}>
          Leave Requests
        </button>
      </div>

      {activeTab === "session" && (
        <>
          <input
            type="text"
            placeholder="Enter Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input-subject"
          />
          <br />
          <input
            type="text"
            placeholder="Enter Secret Code (e.g., today's word)"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
            className="input-subject"
          />
          <br />

          <div className="button-group">
            <button onClick={createSession} className="btn-generate">
              Create Session
            </button>
            <button onClick={generateQR} className="btn-generate">
              Generate QR
            </button>
            <button onClick={fetchReport} className="btn-report">
              View Report
            </button>
            <button onClick={closeSession} className="btn-close" style={{ marginLeft: 8 }}>
              Close Session
            </button>
          </div>

          {sessionId && (
            <div style={{ marginTop: 8 }}>
              <strong>Session:</strong> <span style={{ fontFamily: "monospace" }}>{sessionId}</span>
            </div>
          )}

          {qrValue && (
            <div className="qr-section">
              <QRCodeCanvas value={qrValue} size={250} style={{background:"#fff"}} />
              <p>Students scan this QR</p>
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 8, background: "#eee", borderRadius: 4, overflow: "hidden", width: 250 }}>
                  <div
                    style={{
                      height: "100%",
                      background: "#6c6cff",
                      width: `${((30 - (qrRemaining || 0)) / 30) * 100}%`,
                      transition: "width 0.25s linear"
                    }}
                  />
                </div>
                <div style={{ marginTop: 6, fontSize: 14 }}>
                  {qrRemaining > 0 ? `QR expires in ${qrRemaining}s` : "Refreshing QR..."}
                </div>
              </div>
            </div>
          )}

          {message && <p className="message">{message}</p>}

          {subject && (
            <div className={`live-count ${pulse ? "pulse" : ""}`}>
              Live Attendance: {liveCount} ✅
            </div>
          )}

          {percentage !== null && (
            <p className="attendance-percentage">Attendance Percentage: {percentage}%</p>
          )}

          {report.length > 0 && (
            <div className="table-wrapper">
              <h3>Attendance Report for {subject}</h3>
              <table border="1" cellPadding="8">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((r, idx) => (
                    <tr key={idx}>
                      <td>{r.studentId?.name || "N/A"}</td>
                      <td>{r.studentId?.email || "N/A"}</td>
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "leave" && <TeacherLeave />}
    </div>
  );
}
