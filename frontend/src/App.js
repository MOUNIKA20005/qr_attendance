import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentAttendance from "./components/StudentAttendance";
import Landing from "./components/Landing";
import AdminDashboard from "./components/AdminDashboard"; // adjust path if needed
import Report from "./components/Report";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page as root */}
        <Route path="/" element={<Landing />} />

        {/* Login routes */}
        <Route path="/login" element={<Login />} />

        {/* Registration */}
        <Route path="/register" element={<Register />} />

        {/* Dashboards */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />

        {/* Student attendance page */}
        <Route path="/student/attendance" element={<StudentAttendance />} />
        <Route path="/admin" element={<AdminDashboard/>} />
        <Route path="/admin/report" element={<Report />} />


        

      </Routes>
    </BrowserRouter>
  );
}

export default App;
