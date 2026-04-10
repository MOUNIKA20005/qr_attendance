import axios from "axios";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import KpiCards from "./KpiCards";
import Heatmap from "./Heatmap";

export default function Analytics() {
  const token = localStorage.getItem("token");

  // FILTERS
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // DATA
  const [subjectData, setSubjectData] = useState([]);
  const [dailyData, setDailyData] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  // FETCH ANALYTICS
  const fetchAnalytics = async () => {
    try {
      const params = {};
      if (subject) params.subject = subject;
      if (from && to) {
        params.from = from;
        params.to = to;
      }

      const [subjectRes, dailyRes] = await Promise.all([
        axios.get("http://localhost:5000/api/analytics/subject-wise", {
          headers,
          params,
        }),
        axios.get("http://localhost:5000/api/analytics/daily", {
          headers,
          params,
        }),
      ]);

      setSubjectData(subjectRes.data || []);
      setDailyData(dailyRes.data || []);
    } catch (err) {
      console.error("Analytics fetch failed", err);
    }
  };

  // EXPORT CSV
  const exportCSV = async () => {
    try {
      const params = {};
      if (subject) params.subject = subject;
      if (from && to) {
        params.from = from;
        params.to = to;
      }

      const res = await axios.get(
        "http://localhost:5000/api/analytics/export",
        {
          headers,
          params,
          responseType: "blob",
        }
      );

      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance-analytics.csv";
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed", err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div style={{ background: "white", padding: 20, borderRadius: 12 }}>
      <KpiCards />

      <h2 style={{ marginBottom: 20 }}>📊 Attendance Analytics</h2>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />

        <button onClick={fetchAnalytics}>Apply</button>
        <button onClick={exportCSV}>Export CSV</button>
      </div>

      {/* SUBJECT WISE */}
      <div style={{ height: 300 }}>
        <h3>Subject-wise Attendance</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={subjectData}>
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* DAILY TREND */}
      <div style={{ height: 300, marginTop: 40 }}>
        <h3>Daily Attendance Trend</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dailyData}>
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Line dataKey="count" stroke="#16a34a" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Heatmap token={token} subjectFilter={subject} from={from}to={to}/>
    </div>
  );
}
