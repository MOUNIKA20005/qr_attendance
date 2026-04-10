import { useEffect, useState } from "react";
import axios from "axios";

export default function Heatmap({ token, subjectFilter, from, to }) {
  const [heatmapData, setHeatmapData] = useState([]);

  const fetchHeatmap = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params = {};

      if (subjectFilter) params.subject = subjectFilter;
      if (from && to) {
        params.from = from;
        params.to = to;
      }

      const res = await axios.get(
        "http://localhost:5000/api/analytics/heatmap",
        { headers, params }
      );

      setHeatmapData(res.data);
    } catch (err) {
      console.error("Heatmap fetch failed", err);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, [subjectFilter, from, to]);

  return (
    <div style={{ marginTop: 40 }}>
      <h3>📊 Attendance Heatmap</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: 6 }}>Date</th>
            {heatmapData[0]?.subjects?.map((s) => (
              <th
                key={s.subject}
                style={{ border: "1px solid #ccc", padding: 6 }}
              >
                {s.subject}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heatmapData.map((row) => (
            <tr key={row.date}>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>
                {row.date}
              </td>
              {row.subjects.map((s) => (
                <td
                  key={s.subject}
                  style={{
                    border: "1px solid #ccc",
                    padding: 6,
                    background: `rgba(34, 197, 94, ${s.percentage / 100})`,
                    color: s.percentage > 50 ? "white" : "black",
                    textAlign: "center",
                  }}
                >
                  {s.present}/{s.total}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
