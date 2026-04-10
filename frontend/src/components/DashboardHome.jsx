import React from "react";

export default function DashboardHome({ users, attendance, liveStats }) {
  return (
    <div>
      <h2>Dashboard Overview</h2>
      <p>Total Users: {users.length}</p>
      <p>Total Attendance Records: {attendance.length}</p>
      <p>Live Stats Count: {liveStats.length}</p>
    </div>
  );
}