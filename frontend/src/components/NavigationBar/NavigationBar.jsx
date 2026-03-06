import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./bhasabridge_logo.png";
import "./NavigationBar.css";
import {
  LayoutDashboard,
  LucideLibrary,
  BookCheck,
  LogOut,
} from "lucide-react";

const navLinks = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Lesson", icon: LucideLibrary, path: "/lessons" },
  { name: "Quiz", icon: BookCheck, path: "/quiz" },
];

function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="left-sidebar">
      <div className="logo-div">
        <img src={Logo} alt="Logo" className="Logo" />
        <span>
          <span style={{ color: "#103562" }}>Bhasa</span>
          <span style={{ color: "#5bbac6" }}>Bridge</span>
        </span>
      </div>

      <div className="nav-container">
        {navLinks.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`navlinks ${location.pathname === item.path ? "selected" : ""}`}
          >
            <item.icon />
            <span>{item.name}</span>
          </Link>
        ))}
      </div>

      {/* ✅ Logout button pinned to bottom */}
      <div className="nav-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default NavigationBar;
