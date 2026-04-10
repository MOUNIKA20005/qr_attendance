import React from "react";

export default function Students({ users }) {
  return (
    <div>
      <h2>Students</h2>
      {users.length === 0 && <p>No students found</p>}
      <ul>
        {users.map((u) => (
          <li key={u._id || u.email}>{u.name || u.email}</li>
        ))}
      </ul>
    </div>
  );
}