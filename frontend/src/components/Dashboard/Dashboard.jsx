import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const MAX_HEARTS = 5;

const Dashboard = () => {
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [studyGuide, setStudyGuide] = useState(null);
  const [guideLoading, setGuideLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedName = localStorage.getItem("username");
    if (storedName) setUsername(storedName);

    fetch("/api/user/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});

    fetch("/api/leaderboard", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setLeaderboard(data))
      .catch(() => {});

    fetch("/api/progress/study-guide", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStudyGuide(data))
      .catch(() => setStudyGuide(null))
      .finally(() => setGuideLoading(false));
  }, []);

  const xp = stats?.xp ?? 0;
  const streak = stats?.streak ?? 0;
  const level = stats?.level ?? 1;
  const hearts = stats?.hearts ?? MAX_HEARTS;
  const prevXp = stats?.prev_level_xp ?? 0;
  const nextXp = stats?.next_level_xp ?? 50;
  const reviewUnlocked = Boolean(studyGuide?.review_unlocked);
  const reviewDue = studyGuide?.review_due || 0;
  const continueUnit = studyGuide?.continue_unit || null;
  const nextLesson = studyGuide?.new_lesson || null;
  const weakTopics = studyGuide?.weak_topics;
  const xpProgress =
    nextXp > prevXp
      ? Math.min(Math.round(((xp - prevXp) / (nextXp - prevXp)) * 100), 100)
      : 100;

  const studyCards = useMemo(
    () => {
      const topicList = weakTopics || [];
      return [
        {
          title: "Continue Unit",
          tone: "current",
          value: continueUnit
            ? continueUnit.unit_title
            : "Pick an unlocked unit to keep your momentum going.",
          detail: continueUnit
            ? `${continueUnit.level} level`
            : "Your guided curriculum is ready whenever you are.",
        },
        {
          title: "Review Due",
          tone: "review",
          value: reviewUnlocked
            ? `${reviewDue} item${reviewDue === 1 ? "" : "s"} waiting`
            : "Locked until your first unit completion",
          detail: reviewUnlocked
            ? reviewDue > 0
              ? "Clearing due reviews is the best return-visit habit."
              : "You are caught up for now."
            : "Finish one guided unit to unlock spaced review.",
        },
        {
          title: "New Lesson",
          tone: "new",
          value: nextLesson
            ? nextLesson.unit_title
            : "No locked units right now",
          detail: nextLesson
            ? `${nextLesson.level} level`
            : "Keep reviewing or deepen your free practice.",
        },
        {
          title: "Weak Topics",
          tone: "weak",
          value: topicList.length
            ? topicList
                .map((topic) => `${topic.unit_title || "Core"} (${topic.weak_count})`)
                .join(" · ")
            : "No weak-topic pattern yet",
          detail: topicList.length
            ? "These are the topics most worth revisiting next."
            : "Mistakes from checkpoints and review will appear here.",
        },
      ];
    },
    [continueUnit, nextLesson, reviewDue, reviewUnlocked, weakTopics],
  );

  return (
    <div className="dashboard-container">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-kicker">Learning Dashboard</p>
          <h1>Namaste, {username || "Learner"}</h1>
          <p className="dashboard-subtitle">
            Keep your Nepal Bhasa practice small, steady, and easy to return to.
          </p>
        </div>

        <div className="dashboard-focus-card">
          <span className="dashboard-focus-label">Best Next Step</span>
          <strong>
            {reviewUnlocked && reviewDue > 0
              ? "Clear your Review Loop"
              : continueUnit
                ? `Resume ${continueUnit.unit_title}`
                : "Start your next guided unit"}
          </strong>
          <p>
            {reviewUnlocked && reviewDue > 0
              ? "Due reviews are the fastest way to strengthen memory."
              : "A short guided session today is enough to keep the habit moving."}
          </p>
          <button
            className="dashboard-focus-btn"
            onClick={() =>
              navigate(reviewUnlocked && reviewDue > 0 ? "/review" : "/lessons")
            }
          >
            {reviewUnlocked && reviewDue > 0
              ? "Open Review Loop"
              : "Continue Curriculum"}
          </button>
        </div>
      </section>

      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon trophy">XP</div>
          <div className="stat-info">
            <p className="stat-label">Total XP · Level {level}</p>
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

        <div className="stat-card">
          <div className="stat-icon flame">ST</div>
          <div className="stat-info">
            <p className="stat-label">Day Streak</p>
            <h2 className="stat-value">{streak}</h2>
            <p className="stat-meta">
              {streak === 0
                ? "Start your streak today with one guided unit."
                : streak === 1
                  ? "One day down. A little consistency goes a long way."
                  : `${streak} days and counting.`}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon heart">HP</div>
          <div className="stat-info">
            <p className="stat-label">Hearts</p>
            <div className="heart-row">
              {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                <span
                  key={i}
                  className={`heart-dot ${i < hearts ? "full" : "empty"}`}
                >
                  ❤
                </span>
              ))}
            </div>
            <p className="stat-meta">Hearts refill after each completed unit.</p>
          </div>
        </div>
      </div>

      <section className="study-guide-section">
        <div className="section-heading">
          <div>
            <h2>Study Guide</h2>
            <p>Use this as your daily map instead of guessing what to do next.</p>
          </div>
          <button className="view-all-btn" onClick={() => navigate("/lessons")}>
            View all lessons
          </button>
        </div>

        {guideLoading ? (
          <div className="study-guide-loading">Loading your study guide...</div>
        ) : (
          <div className="study-guide-grid">
            {studyCards.map((card) => (
              <article
                key={card.title}
                className={`study-guide-card study-guide-card-${card.tone}`}
              >
                <span className="study-guide-label">{card.title}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {leaderboard.length > 0 && (
        <section className="leaderboard-section">
          <div className="section-heading compact">
            <div>
              <h2>Leaderboard</h2>
              <p>See how your consistency compares with other learners.</p>
            </div>
          </div>

          <div className="leaderboard-list">
            {leaderboard.slice(0, 5).map((user, i) => (
              <div
                key={i}
                className={`leaderboard-row ${user.name === username ? "me" : ""}`}
              >
                <span className="lb-rank">
                  {i === 0
                    ? "1"
                    : i === 1
                      ? "2"
                      : i === 2
                        ? "3"
                        : `#${i + 1}`}
                </span>
                <span className="lb-name">{user.name}</span>
                <span className="lb-xp">{user.xp} XP</span>
                <span className="lb-streak">{user.streak} day streak</span>
                <span className="lb-level">Lv.{user.level}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
