import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const MAX_HEARTS = 5;

const Dashboard = () => {
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedName = localStorage.getItem("username");
    if (storedName) setUsername(storedName);

    // Fetch live stats
    fetch("/api/user/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});

    // Fetch leaderboard
    fetch("/api/leaderboard", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setLeaderboard(data))
      .catch(() => {});
  }, []);

  const xp = stats?.xp ?? 0;
  const streak = stats?.streak ?? 0;
  const level = stats?.level ?? 1;
  const hearts = stats?.hearts ?? MAX_HEARTS;
  const prevXp = stats?.prev_level_xp ?? 0;
  const nextXp = stats?.next_level_xp ?? 50;
  const xpProgress =
    nextXp > prevXp
      ? Math.min(Math.round(((xp - prevXp) / (nextXp - prevXp)) * 100), 100)
      : 100;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Namaste, {username || "Guest"} 🙏</h1>
        <p>Ready to continue your journey?</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-container">
        {/* XP + Level */}
        <div className="stat-card">
          <div className="stat-icon trophy">🏆</div>
          <div className="stat-info">
            <p className="stat-label">TOTAL XP · LEVEL {level}</p>
            <h2 className="stat-value">{xp}</h2>
            <div className="xp-progress-wrap">
              <div className="xp-progress-bar">
                <div
                  className="xp-progress-fill"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <span className="xp-progress-label">
                {xp} / {nextXp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="stat-card">
          <div className="stat-icon flame">🔥</div>
          <div className="stat-info">
            <p className="stat-label">DAY STREAK</p>
            <h2 className="stat-value">{streak}</h2>
            <p
              style={{ margin: "4px 0 0", fontSize: "12px", color: "#6c757d" }}
            >
              {streak === 0
                ? "Start your streak today!"
                : streak === 1
                  ? "Keep it up!"
                  : `${streak} days and counting!`}
            </p>
          </div>
        </div>

        {/* Hearts */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#ffe9e9" }}>
            ❤️
          </div>
          <div className="stat-info">
            <p className="stat-label">HEARTS</p>
            <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
              {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "1.4rem",
                    filter: i < hearts ? "none" : "grayscale(1) opacity(0.3)",
                  }}
                >
                  ❤️
                </span>
              ))}
            </div>
            <p
              style={{ margin: "6px 0 0", fontSize: "12px", color: "#6c757d" }}
            >
              Refills after each lesson
            </p>
          </div>
        </div>
      </div>

      {/* Up Next */}
      <div className="up-next-section">
        <div className="up-next-header">
          <h2>Up Next</h2>
          <button className="view-all-btn" onClick={() => navigate("/lessons")}>
            View all lessons
          </button>
        </div>

        <div className="lesson-preview-card">
          <div className="lesson-preview-content">
            <span className="lesson-badge">
              ⭐ LESSON 1 ·{" "}
              {level < 3 ? "BEGINNER" : level < 6 ? "INTERMEDIATE" : "ADVANCED"}
            </span>
            <p className="lesson-preview-text">
              Learn how to greet people in Bhaktapur Newari. Practice words,
              sentences, and mini-quizzes!
            </p>
          </div>
          <button
            className="start-lesson-btn"
            onClick={() => navigate("/lessons")}
          >
            Start Lesson →
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="leaderboard-section">
          <h2>🏅 Leaderboard</h2>
          <div className="leaderboard-list">
            {leaderboard.slice(0, 5).map((user, i) => (
              <div
                key={i}
                className={`leaderboard-row ${user.name === username ? "me" : ""}`}
              >
                <span className="lb-rank">
                  {i === 0
                    ? "🥇"
                    : i === 1
                      ? "🥈"
                      : i === 2
                        ? "🥉"
                        : `#${i + 1}`}
                </span>
                <span className="lb-name">{user.name}</span>
                <span className="lb-xp">{user.xp} XP</span>
                <span className="lb-streak">🔥 {user.streak}</span>
                <span className="lb-level">Lv.{user.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
