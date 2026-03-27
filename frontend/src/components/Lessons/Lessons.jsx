import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import "./Lessons.css";
import LessonCompleteModal from "../LessonCompleteModal/LessonCompleteModal";

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

const MAX_HEARTS = 5;
const OPTION_KEYS = ["A", "B", "C", "D"];

// â”€â”€ Practice (mini-quiz) sub-component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PracticeSection = ({ level, lessonIds, onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFeedback, setShowFeedback] = useState(null); // "correct" | "wrong"

  // Load quiz questions for this level, filtered to the specific lesson items shown
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Build query: filter by level; if we have lesson IDs, also pass them for specificity
        let url = `/api/quizzes?level=${level}&limit=50`;
        if (lessonIds && lessonIds.length > 0) {
          url += `&lesson_ids=${lessonIds.join(",")}`;
        }
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        // Deduplicate by question text, then shuffle
        const seen = new Set();
        const unique = data.filter((q) => {
          const key = q.question_text.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setQuestions(unique.sort(() => Math.random() - 0.5));
      } catch {
        setError("Could not load practice questions. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [level, lessonIds]);

  const handleSelect = async (key) => {
    if (answered) return;
    setSelected(key);
    setAnswered(true);

    const q = questions[current];
    const isCorrect = key === q.correct_option;

    if (isCorrect) {
      setShowFeedback("correct");
    } else {
      setShowFeedback("wrong");
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      // Deduct heart via API
      try {
        const res = await fetch("/api/lesson/wrong_answer", {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setHearts(data.hearts);
        } else {
          setHearts((h) => Math.max(0, h - 1));
        }
      } catch {
        setHearts((h) => Math.max(0, h - 1));
      }
    }
  };

  const handleNext = async () => {
    const nextIndex = current + 1;
    if (nextIndex >= questions.length) {
      // Lesson complete — call API
      try {
        const res = await fetch("/api/lesson/complete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mistakes, level }),
        });
        if (res.ok) {
          const data = await res.json();
          onComplete(data);
        } else {
          onComplete({ xp_earned: 0, streak: 0, level: 1, mistakes });
        }
      } catch {
        onComplete({ xp_earned: 0, streak: 0, level: 1, mistakes });
      }
    } else {
      setCurrent(nextIndex);
      setSelected(null);
      setAnswered(false);
      setShowFeedback(null);
    }
  };

  if (loading)
    return (
      <p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>
        Loading practice questions...
      </p>
    );
  if (error)
    return (
      <p style={{ textAlign: "center", color: "#dc3545", marginTop: 40 }}>
        {error}
      </p>
    );
  if (questions.length === 0)
    return (
      <p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>
        No practice questions available yet for this level.
      </p>
    );

  const q = questions[current];
  const optionMap = {
    A: q.option_a,
    B: q.option_b,
    C: q.option_c,
    D: q.option_d,
  };
  const progress = Math.round((current / questions.length) * 100);

  return (
    <div className="practice-container">
      {/* Hearts + Progress */}
      <div className="practice-topbar">
        <div className="practice-hearts">
          {Array.from({ length: MAX_HEARTS }).map((_, i) => (
            <span
              key={i}
              className={`ph-heart ${i < hearts ? "full" : "empty"}`}
            >
              <Heart
                size={16}
                fill={i < hearts ? "#ff4d6d" : "none"}
                stroke={i < hearts ? "#ff4d6d" : "#bbb"}
                strokeWidth={1.5}
              />
            </span>
          ))}
        </div>
        <div className="practice-progress-wrap">
          <div className="practice-progress-bar">
            <div
              className="practice-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="practice-counter">
            {current + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Feedback banner */}
      {showFeedback && (
        <div className={`practice-feedback ${showFeedback}`}>
          {showFeedback === "correct"
            ? "Correct! Great job!"
            : `Incorrect! The answer was ${q.correct_option}: ${optionMap[q.correct_option]}`}
        </div>
      )}

      {/* Question card */}
      <div className="exercises-content">
        <div className="exercise-item">
          <div className="question-text">
            <span
              style={{
                color: "#6c757d",
                fontSize: "13px",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Question {current + 1}
            </span>
            {q.question_text}
          </div>
          <div className="option-container">
            {OPTION_KEYS.map((key) => {
              let badge = null;
              if (answered) {
                if (key === q.correct_option)
                  badge = <span className="correct-badge">✓ Correct</span>;
                else if (key === selected && key !== q.correct_option)
                  badge = <span className="incorrect-badge">✗ Wrong</span>;
              }
              return (
                <label
                  key={key}
                  className="option-label"
                  onClick={() => handleSelect(key)}
                >
                  <input
                    type="radio"
                    name="option"
                    checked={selected === key}
                    onChange={() => {}}
                    disabled={answered}
                  />
                  <span>
                    <strong>{key}.</strong> {optionMap[key]}
                  </span>
                  {badge}
                </label>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && q.explanation && (
            <div className="practice-explanation">{q.explanation}</div>
          )}
        </div>

        {answered && (
          <button className="practice-next-btn" onClick={handleNext}>
            {current + 1 === questions.length
              ? "Finish Lesson"
              : "Next Question →"}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Lessons component ───────────────────────────────────────────────────
const Lessons = () => {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [activeTab, setActiveTab] = useState("words");
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completeResult, setCompleteResult] = useState(null);
  const [statsRefresh, setStatsRefresh] = useState(0);
  const [levelStats, setLevelStats] = useState({});

  // Fetch per-level XP stats for curriculum cards
  useEffect(() => {
    fetch("/api/lesson/level-stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setLevelStats(data))
      .catch(() => {});
  }, [statsRefresh]);

  // Fetch lessons when a level is selected
  useEffect(() => {
    if (!selectedLevel) return;

    const fetchLessons = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/lessons?level=${selectedLevel}&limit=100`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error("Failed to fetch lessons");
        const data = await res.json();
        setLessons(data);
      } catch {
        setError("Could not load lessons. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [selectedLevel]);

  const words = lessons.filter((l) => l.item_type === "word");
  const sentences = lessons.filter((l) => l.item_type === "sentence");

  const handlePracticeComplete = (result) => {
    setCompleteResult(result);
    setStatsRefresh((n) => n + 1);
  };

  const handleModalContinue = () => {
    setCompleteResult(null);
    setSelectedLevel(null);
    setLessons([]);
    setActiveTab("words");
  };

  // â”€â”€â”€ Lesson Detail View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (selectedLevel) {
    const meta = LEVEL_META[selectedLevel];
    return (
      <div className="lessons-container">
        {/* Completion modal */}
        {completeResult && (
          <LessonCompleteModal
            result={completeResult}
            onContinue={handleModalContinue}
          />
        )}

        {/* Header */}
        <div className="lesson-header">
          <button
            onClick={() => {
              setSelectedLevel(null);
              setLessons([]);
            }}
          >
            ←
          </button>
          <div>
            <p style={{ color: meta.color, fontWeight: 600, marginBottom: 4 }}>
              {meta.label} Level
            </p>
            <h2>
              {selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)}{" "}
              Lessons
            </h2>
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
          <button
            className={activeTab === "practice" ? "active" : ""}
            onClick={() => setActiveTab("practice")}
          >
            Practice
          </button>
        </div>

        {/* Content */}
        <div className="lesson-content">
          {activeTab === "practice" ? (
            <PracticeSection
              key={selectedLevel}
              level={selectedLevel}
              lessonIds={lessons.map((l) => l.id)}
              onComplete={handlePracticeComplete}
            />
          ) : (
            <>
              {loading && (
                <p
                  style={{ textAlign: "center", color: "#888", marginTop: 40 }}
                >
                  Loading lessons...
                </p>
              )}
              {error && (
                <p
                  style={{
                    textAlign: "center",
                    color: "#dc3545",
                    marginTop: 40,
                  }}
                >
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
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#1a1a2e",
                          fontSize: "15px",
                        }}
                      >
                        {item.english_text}
                      </span>
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
                  {!loading &&
                    (activeTab === "words" ? words : sentences).length ===
                      0 && (
                      <p
                        style={{
                          textAlign: "center",
                          color: "#888",
                          marginTop: 40,
                        }}
                      >
                        No {activeTab} found for this level.
                      </p>
                    )}

                  {/* Prompt to practice */}
                  {!loading &&
                    (activeTab === "words" ? words : sentences).length > 0 && (
                      <div className="practice-prompt-banner">
                        <span>Ready to test yourself?</span>
                        <button onClick={() => setActiveTab("practice")}>
                          Start Practice
                        </button>
                      </div>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // â”€â”€â”€ Curriculum View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="lessons-container">
      <div className="curriculum-header">
        <h1>Curriculum</h1>
        <p>A structured path to mastering the Bhaktapur dialect.</p>
      </div>

      <div className="lessons-grid">
        {LEVELS.map((level, index) => {
          const meta = LEVEL_META[level];
          const stats = levelStats[level] || {};
          const xpEarned = stats.lesson_xp_earned || 0;
          const completions = stats.lessons_completed || 0;
          return (
            <div key={level} className="lesson-card">
              <div className="lesson-number" style={{ color: meta.color }}>
                Lesson {index + 1}
              </div>
              <h3>
                {level.charAt(0).toUpperCase() + level.slice(1)} — {meta.label}
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
                {xpEarned > 0 && (
                  <span
                    style={{
                      background: "#fff8e1",
                      color: "#e6a817",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {xpEarned} XP earned
                  </span>
                )}
                {completions > 0 && (
                  <span
                    style={{
                      background: "#e8f5e9",
                      color: "#28a745",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {completions}x completed
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedLevel(level);
                  setActiveTab("words");
                }}
              >
                {completions > 0 ? "Practice Again" : "Start Lesson"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Lessons;
