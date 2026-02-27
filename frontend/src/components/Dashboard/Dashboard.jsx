import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const Dashboard = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Get username from localStorage
    const storedName = localStorage.getItem("username");
    if (storedName) {
      setUsername(storedName);
    }
  }, []);

  const handleStartLesson = () => {
    navigate("/lessons");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Namaste, {username || "Guest"} 🙏</h1>
        <p>Ready to continue your journey?</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon trophy">🏆</div>
          <div className="stat-info">
            <p className="stat-label">TOTAL XP</p>
            <h2 className="stat-value">0</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon flame">🔥</div>
          <div className="stat-info">
            <p className="stat-label">DAY STREAK</p>
            <h2 className="stat-value">1</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon book">📖</div>
          <div className="stat-info">
            <p className="stat-label">COURSE PROGRESS</p>
            <h2 className="stat-value">0%</h2>
          </div>
        </div>
      </div>

      {/* Up Next Section */}
      <div className="up-next-section">
        <div className="up-next-header">
          <h2>Up Next</h2>
          <button className="view-all-btn" onClick={() => navigate("/lessons")}>
            View all lessons
          </button>
        </div>

        <div className="lesson-preview-card">
          <div className="lesson-preview-content">
            <span className="lesson-badge">⭐ LESSON 1</span>
            <p className="lesson-preview-text">
              Learn how to greet people in Bhaktapur Newari.
            </p>
          </div>
          <button className="start-lesson-btn" onClick={handleStartLesson}>
            Start Lesson →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
