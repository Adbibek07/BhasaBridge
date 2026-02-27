import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./bhasabridge_logo.png";
import "./NavigationBar.css";
import {
  LayoutDashboard,
  LucideLibrary,
  BookCheck,
  LogOut,
} from "lucide-react";

const navLinks = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    name: "Lesson",
    icon: LucideLibrary,
    path: "/lessons",
  },
  {
    name: "Quiz",
    icon: BookCheck,
    path: "/quiz",
  },
];

function NavigationBar() {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("username");
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
            <span>{item?.name}</span>
          </Link>
        ))}
      </div>
      <div className="nav-footer">
        <Link to="/login" className="navlinks" onClick={handleLogout}>
          <LogOut />
          <span>Logout</span>
        </Link>
      </div>
    </div>
  );
}

export default NavigationBar;
