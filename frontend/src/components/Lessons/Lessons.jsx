import React, { useState, useEffect } from "react";
import "./Lessons.css";

const LEVELS = ["easy", "intermediate", "hard"];

const LEVEL_META = {
  easy: {
    label: "Beginner",
    description: "Basic greetings, numbers, and everyday words.",
    color: "#28a745",
  },
  intermediate: {
    label: "Intermediate",
    description: "Shopping, introductions, and common sentences.",
    color: "#fd7e14",
  },
  hard: {
    label: "Advanced",
    description: "Travel, time, bargaining, and complex phrases.",
    color: "#dc3545",
  },
};

const Lessons = () => {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [activeTab, setActiveTab] = useState("words");
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch lessons when a level is selected
  useEffect(() => {
    if (!selectedLevel) return;

    const fetchLessons = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/lessons?level=${selectedLevel}&limit=100`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch lessons");
        const data = await res.json();
        setLessons(data);
      } catch (e) {
        setError("Could not load lessons. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [selectedLevel]);

  const words = lessons.filter((l) => l.item_type === "word");
  const sentences = lessons.filter((l) => l.item_type === "sentence");

  // ─── Lesson Detail View ───────────────────────────────────────────────────
  if (selectedLevel) {
    const meta = LEVEL_META[selectedLevel];
    return (
      <div className="lessons-container">
        {/* Header */}
        <div className="lesson-header">
          <button onClick={() => { setSelectedLevel(null); setLessons([]); }}>
            ←
          </button>
          <div>
            <p style={{ color: meta.color, fontWeight: 600, marginBottom: 4 }}>
              {meta.label} Level
            </p>
            <h2>{selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} Lessons</h2>
            <p>{meta.description}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={activeTab === "words" ? "active" : ""}
            onClick={() => setActiveTab("words")}
          >
            Words ({words.length})
          </button>
          <button
            className={activeTab === "sentences" ? "active" : ""}
            onClick={() => setActiveTab("sentences")}
          >
            Sentences ({sentences.length})
          </button>
        </div>

        {/* Content */}
        <div className="lesson-content">
          {loading && (
            <p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>
              Loading lessons...
            </p>
          )}
          {error && (
            <p style={{ textAlign: "center", color: "#dc3545", marginTop: 40 }}>
              {error}
            </p>
          )}
          {!loading && !error && (
            <div className="reading-content">
              {(activeTab === "words" ? words : sentences).map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    alignItems: "center",
                    padding: "14px 20px",
                    marginBottom: "10px",
                    borderRadius: "10px",
                    background: "white",
                    border: "1px solid #e0e0e0",
                    gap: "10px",
                  }}
                >
                  {/* English */}
                  <span style={{ fontWeight: 600, color: "#1a1a2e", fontSize: "15px" }}>
                    {item.english_text}
                  </span>

                  {/* Newari */}
                  <span
                    style={{
                      fontSize: "18px",
                      color: "#103562",
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    {item.newari_text}
                  </span>

                  {/* Romanized */}
                  <span
                    style={{
                      color: "#6c757d",
                      fontSize: "14px",
                      fontStyle: "italic",
                      textAlign: "right",
                    }}
                  >
                    {item.romanized_text || "—"}
                  </span>
                </div>
              ))}

              {!loading && (activeTab === "words" ? words : sentences).length === 0 && (
                <p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>
                  No {activeTab} found for this level.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Curriculum View ──────────────────────────────────────────────────────
  return (
    <div className="lessons-container">
      <div className="curriculum-header">
        <h1>Curriculum</h1>
        <p>A structured path to mastering the Bhaktapur dialect.</p>
      </div>

      <div className="lessons-grid">
        {LEVELS.map((level, index) => {
          const meta = LEVEL_META[level];
          return (
            <div key={level} className="lesson-card">
              <div className="lesson-number" style={{ color: meta.color }}>
                Lesson {index + 1}
              </div>
              <h3>
                {level.charAt(0).toUpperCase() + level.slice(1)} —{" "}
                {meta.label}
              </h3>
              <p>{meta.description}</p>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    background: "#f0f4ff",
                    color: "#103562",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Words & Sentences
                </span>
                <span
                  style={{
                    background: "#f0f4ff",
                    color: meta.color,
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {meta.label}
                </span>
              </div>
              <button onClick={() => { setSelectedLevel(level); setActiveTab("words"); }}>
                Start Lesson
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Lessons;