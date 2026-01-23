import React, { useState } from "react";
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
  },
  {
    name: "Lesson",
    icon: LucideLibrary,
  },
  {
    name: "Quiz",
    icon: BookCheck,
  },
];

function NavigationBar() {
  const [activeNavIndex, SetActiveNavIndex] = useState(0);

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
          <div
            key={index}
            className={`navlinks ${activeNavIndex === index ? "selected" : ""}`}
            onClick={() => SetActiveNavIndex(index)}
          >
            <item.icon />
            <span>{item?.name}</span>
          </div>
        ))}
      </div>
      <div className="nav-footer">
        <div className="navlinks">
          <LogOut />
          <span>Logout</span>
        </div>
      </div>
    </div>
  );
}

export default NavigationBar;
