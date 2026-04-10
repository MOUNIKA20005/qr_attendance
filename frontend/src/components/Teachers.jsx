import React from "react";

export default function Teachers({ users }) {
  return (
    <div>
      <h2>Teachers</h2>
      {users.length === 0 && <p>No teachers found</p>}
      <ul>
        {users.map((u) => (
          <li key={u._id || u.email}>{u.name || u.email}</li>
        ))}
      </ul>
    </div>
  );
}