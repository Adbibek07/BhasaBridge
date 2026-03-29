import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./NavigationBar.css";
import {
  LayoutDashboard,
  LucideLibrary,
  RotateCcw,
  BookCheck,
  LogOut,
} from "lucide-react";

const navLinks = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Lessons", icon: LucideLibrary, path: "/lessons" },
  { name: "Review", icon: RotateCcw, path: "/review" },
  { name: "Quiz", icon: BookCheck, path: "/quiz" },
];

function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even if the request fails, clear local state and return to login.
    } finally {
      localStorage.removeItem("username");
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  return (
    <div className="left-sidebar">
      <div className="logo-div">
        <img src="/bhasabridge_logo.png" alt="Logo" className="Logo" />
        <div className="logo-copy">
          <span>
          <span style={{ color: "#103562" }}>Bhasa</span>
          <span style={{ color: "#5bbac6" }}>Bridge</span>
          </span>
          <small>Learn Nepal Bhasa with guided practice</small>
        </div>
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
