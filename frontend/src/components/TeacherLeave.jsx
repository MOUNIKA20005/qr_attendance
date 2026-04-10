import React, { useState, useEffect } from "react";
import axios from "axios";

export default function TeacherLeave() {
  const [leaves, setLeaves] = useState([]);
  const [message, setMessage] = useState("");
  const token = localStorage.getItem("token");

  const fetchLeaves = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/leave/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaves(res.data);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to fetch leaves");
    }
  };

  const updateLeave = async (id, status) => {
    try {
      const res = await axios.patch(
        `http://localhost:5000/api/leave/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
      fetchLeaves();
    } catch (err) {
      setMessage(err.response?.data?.message || "Error updating leave");
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  return (
    <div>
      <h3>All Leave Requests</h3>
      {message && <p>{message}</p>}
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Date</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((l) => (
            <tr key={l._id}>
              <td>{l.studentId?.name}</td>
              <td>{new Date(l.date).toLocaleDateString()}</td>
              <td>{l.reason}</td>
              <td>{l.status}</td>
              <td>
                {l.status === "Pending" && (
                  <>
                    <button onClick={() => updateLeave(l._id, "approved")}>✅ Approve</button>
                    <button onClick={() => updateLeave(l._id, "rejected")}>❌ Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
