import React, { useMemo, useState, useEffect } from "react";
import { Heart } from "lucide-react";
import "./Lessons.css";
import LessonCompleteModal from "../LessonCompleteModal/LessonCompleteModal";

const LEVELS = ["easy", "intermediate", "hard"];
const BATCH_SIZE = 3;
const MAX_HEARTS = 5;
const OPTION_KEYS = ["A", "B", "C", "D"];

const LEVEL_META = {
  easy: {
    label: "Beginner",
    description:
      "Start with greetings, numbers, and simple daily conversation.",
    color: "#28a745",
  },
  intermediate: {
    label: "Intermediate",
    description:
      "Move to practical speaking for shopping, time, and introductions.",
    color: "#fd7e14",
  },
  hard: {
    label: "Advanced",
    description: "Master travel, context-heavy usage, and nuanced expressions.",
    color: "#dc3545",
  },
};

const normalizeText = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[\s.,!?;:]+/g, " ");

const Lessons = () => {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedUnitKey, setSelectedUnitKey] = useState(null);
  const [phase, setPhase] = useState("intro");

  const [lessons, setLessons] = useState([]);
  const [unitProgress, setUnitProgress] = useState([]);
  const [levelStats, setLevelStats] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statsRefresh, setStatsRefresh] = useState(0);

  const [batchIndex, setBatchIndex] = useState(0);
  const [recallInput, setRecallInput] = useState("");
  const [recallFeedback, setRecallFeedback] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);

  const [checkpointQuestions, setCheckpointQuestions] = useState([]);
  const [checkpointCurrent, setCheckpointCurrent] = useState(0);
  const [checkpointSelected, setCheckpointSelected] = useState(null);
  const [checkpointAnswered, setCheckpointAnswered] = useState(false);

  const [completeResult, setCompleteResult] = useState(null);

  useEffect(() => {
    fetch("/api/lesson/level-stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setLevelStats(data || {}))
      .catch(() => {});

    fetch("/api/progress/study-guide", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setUnitProgress(data.units || []))
      .catch(() => {});
  }, [statsRefresh]);

  useEffect(() => {
    if (!selectedLevel) return;

    setLoading(true);
    setError("");
    fetch(`/api/lessons?level=${selectedLevel}&limit=200`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((rows) => setLessons(Array.isArray(rows) ? rows : []))
      .catch(() => setError("Could not load units for this level."))
      .finally(() => setLoading(false));
  }, [selectedLevel]);

  const units = useMemo(() => {
    const grouped = {};
    lessons.forEach((item) => {
      const key = item.unit_key || "core";
      if (!grouped[key]) {
        grouped[key] = {
          unit_key: key,
          unit_title: item.unit_title || "Core Phrases",
          sort_order: Number(item.sort_order || 1),
          usage_note:
            item.usage_note || "Practice this unit in short daily sessions.",
          items: [],
        };
      }
      grouped[key].items.push(item);
    });

    return Object.values(grouped).sort((a, b) => a.sort_order - b.sort_order);
  }, [lessons]);

  const currentUnit = useMemo(
    () => units.find((u) => u.unit_key === selectedUnitKey) || null,
    [units, selectedUnitKey],
  );

  const currentBatch = useMemo(() => {
    if (!currentUnit) return [];
    const start = batchIndex * BATCH_SIZE;
    return currentUnit.items.slice(start, start + BATCH_SIZE);
  }, [currentUnit, batchIndex]);

  const recallPrompt = currentBatch[0] || null;

  const currentCheckpointQuestion =
    checkpointQuestions[checkpointCurrent] || null;

  const resetUnitFlow = () => {
    setPhase("intro");
    setBatchIndex(0);
    setRecallInput("");
    setRecallFeedback(null);
    setMistakes(0);
    setHearts(MAX_HEARTS);
    setCheckpointQuestions([]);
    setCheckpointCurrent(0);
    setCheckpointSelected(null);
    setCheckpointAnswered(false);
  };

  const beginUnit = (unitKey) => {
    setSelectedUnitKey(unitKey);
    resetUnitFlow();
  };

  const submitRecall = async () => {
    if (!recallPrompt) return;

    const normalizedInput = normalizeText(recallInput);
    const accepted = [normalizeText(recallPrompt.english_text)].filter(Boolean);

    const ok = accepted.some(
      (ans) => normalizedInput === ans || normalizedInput.includes(ans),
    );
    if (ok) {
      setRecallFeedback({ ok: true, text: "Nice recall. Keep going." });
      return;
    }

    setRecallFeedback({
      ok: false,
      text: `Expected: ${recallPrompt.english_text}`,
    });
    setMistakes((m) => m + 1);

    try {
      const res = await fetch("/api/lesson/wrong_answer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: recallPrompt.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setHearts(data.hearts ?? hearts);
      }
    } catch {
      setHearts((h) => Math.max(0, h - 1));
    }
  };

  const continueAfterRecall = async () => {
    const isLastBatch =
      currentUnit && (batchIndex + 1) * BATCH_SIZE >= currentUnit.items.length;

    if (!isLastBatch) {
      setBatchIndex((b) => b + 1);
      setRecallInput("");
      setRecallFeedback(null);
      setPhase("learn");
      return;
    }

    if (!currentUnit) return;
    const lessonIds = currentUnit.items.map((i) => i.id);
    try {
      const res = await fetch(
        `/api/quizzes?level=${selectedLevel}&lesson_ids=${lessonIds.join(",")}&limit=8`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error();
      const rows = await res.json();
      const dedup = [];
      const seen = new Set();
      rows.forEach((q) => {
        const key = normalizeText(q.question_text);
        if (!seen.has(key)) {
          seen.add(key);
          dedup.push(q);
        }
      });
      setCheckpointQuestions(dedup.slice(0, 5));
      setCheckpointCurrent(0);
      setCheckpointSelected(null);
      setCheckpointAnswered(false);
      setPhase("checkpoint");
    } catch {
      setError("Could not load checkpoint questions.");
    }
  };

  const submitCheckpointAnswer = async (key) => {
    if (checkpointAnswered || !currentCheckpointQuestion) return;
    setCheckpointSelected(key);
    setCheckpointAnswered(true);

    if (key !== currentCheckpointQuestion.correct_option) {
      setMistakes((m) => m + 1);
      try {
        const res = await fetch("/api/lesson/wrong_answer", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quiz_id: currentCheckpointQuestion.id,
            lesson_id: currentCheckpointQuestion.lesson_id,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setHearts(data.hearts ?? hearts);
        }
      } catch {
        setHearts((h) => Math.max(0, h - 1));
      }
    }
  };

  const nextCheckpoint = async () => {
    const isLast = checkpointCurrent + 1 >= checkpointQuestions.length;
    if (!isLast) {
      setCheckpointCurrent((n) => n + 1);
      setCheckpointSelected(null);
      setCheckpointAnswered(false);
      return;
    }

    try {
      const res = await fetch("/api/lesson/complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: selectedLevel,
          mistakes,
          unit_key: currentUnit?.unit_key,
        }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setCompleteResult(result);
      setStatsRefresh((n) => n + 1);
      setPhase("done");
    } catch {
      setCompleteResult({ xp_earned: 0, streak: 0, level: 1 });
      setPhase("done");
    }
  };

  const onContinueFromModal = () => {
    setCompleteResult(null);
    setSelectedUnitKey(null);
    setPhase("intro");
    setStatsRefresh((n) => n + 1);
  };

  if (!selectedLevel) {
    return (
      <div className="lessons-container">
        <div className="curriculum-header">
          <h1>Guided Curriculum</h1>
          <p>
            Learn in units, recall immediately, then review weak items later.
          </p>
        </div>

        <div className="lessons-grid">
          {LEVELS.map((level, index) => {
            const meta = LEVEL_META[level];
            const stats = levelStats[level] || {};
            return (
              <div key={level} className="lesson-card">
                <div className="lesson-number" style={{ color: meta.color }}>
                  Level {index + 1}
                </div>
                <h3>
                  {level.charAt(0).toUpperCase() + level.slice(1)} -{" "}
                  {meta.label}
                </h3>
                <p>{meta.description}</p>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      background: "#f0f4ff",
                      color: "#103562",
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {stats.lessons_completed || 0} units done
                  </span>
                  <span
                    style={{
                      background: "#fff8e1",
                      color: "#e6a817",
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {stats.lesson_xp_earned || 0} XP earned
                  </span>
                </div>
                <button onClick={() => setSelectedLevel(level)}>
                  Open Guided Units
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const levelMeta = LEVEL_META[selectedLevel];

  if (!selectedUnitKey) {
    return (
      <div className="lessons-container">
        <div className="lesson-header">
          <button onClick={() => setSelectedLevel(null)}>←</button>
          <div>
            <p
              style={{
                color: levelMeta.color,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {levelMeta.label} Level
            </p>
            <h2>Choose a Unit</h2>
            <p>{levelMeta.description}</p>
          </div>
        </div>

        {loading && (
          <p style={{ textAlign: "center", color: "#666" }}>Loading units...</p>
        )}
        {error && (
          <p style={{ textAlign: "center", color: "#dc3545" }}>{error}</p>
        )}

        {!loading && !error && (
          <div className="lessons-grid">
            {units.map((unit) => {
              const progress = unitProgress.find(
                (u) =>
                  u.level === selectedLevel && u.unit_key === unit.unit_key,
              );
              const isUnlocked = progress
                ? Boolean(progress.is_unlocked)
                : unit.sort_order === 1;
              const isCompleted = progress
                ? Boolean(progress.is_completed)
                : false;
              return (
                <div
                  key={unit.unit_key}
                  className="lesson-card"
                  style={{ opacity: isUnlocked ? 1 : 0.55 }}
                >
                  <div
                    className="lesson-number"
                    style={{ color: levelMeta.color }}
                  >
                    Unit {unit.sort_order}
                  </div>
                  <h3>{unit.unit_title}</h3>
                  <p>{unit.usage_note}</p>
                  <p style={{ marginTop: -6, marginBottom: 16, fontSize: 13 }}>
                    {unit.items.length} items ·{" "}
                    {isCompleted ? "Completed" : "Not completed"}
                  </p>
                  <button
                    disabled={!isUnlocked}
                    onClick={() => beginUnit(unit.unit_key)}
                  >
                    {isUnlocked
                      ? isCompleted
                        ? "Review Unit"
                        : "Start Unit"
                      : "Locked"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="lessons-container">
      {completeResult && (
        <LessonCompleteModal
          result={completeResult}
          onContinue={onContinueFromModal}
        />
      )}

      <div className="lesson-header">
        <button
          onClick={() => {
            setSelectedUnitKey(null);
            resetUnitFlow();
          }}
        >
          ←
        </button>
        <div>
          <p
            style={{ color: levelMeta.color, fontWeight: 600, marginBottom: 4 }}
          >
            {levelMeta.label} · {currentUnit?.unit_title}
          </p>
          <h2>
            {phase === "intro" && "Unit Intro"}
            {phase === "learn" && "Learn"}
            {phase === "recall" && "Try Now"}
            {phase === "checkpoint" && "Checkpoint"}
            {phase === "done" && "Completed"}
          </h2>
          <p>{currentUnit?.usage_note}</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {Array.from({ length: MAX_HEARTS }).map((_, i) => (
            <Heart
              key={i}
              size={18}
              fill={i < hearts ? "#ff4d6d" : "none"}
              stroke={i < hearts ? "#ff4d6d" : "#bbb"}
            />
          ))}
        </div>
      </div>

      <div className="lesson-content">
        {phase === "intro" && (
          <div className="reading-content">
            <p>
              This unit has {currentUnit?.items.length || 0} items. You will
              learn them in small batches, recall right away, then pass a short
              checkpoint.
            </p>
            <button onClick={() => setPhase("learn")}>Start Learning</button>
          </div>
        )}

        {phase === "learn" && (
          <div className="reading-content">
            <p style={{ marginBottom: 18 }}>
              Batch {batchIndex + 1} of{" "}
              {Math.max(
                1,
                Math.ceil((currentUnit?.items.length || 0) / BATCH_SIZE),
              )}
            </p>
            {currentBatch.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  alignItems: "center",
                  padding: "12px 16px",
                  marginBottom: 10,
                  borderRadius: 10,
                  border: "1px solid #e0e0e0",
                  background: "#fff",
                  gap: 8,
                }}
              >
                <strong>{item.english_text}</strong>
                <span
                  style={{
                    textAlign: "center",
                    color: "#103562",
                    fontWeight: 600,
                  }}
                >
                  {item.newari_text}
                </span>
                <span
                  style={{
                    textAlign: "right",
                    color: "#6c757d",
                    fontStyle: "italic",
                  }}
                >
                  {item.romanized_text || "-"}
                </span>
              </div>
            ))}
            <button onClick={() => setPhase("recall")}>Try Now</button>
          </div>
        )}

        {phase === "recall" && recallPrompt && (
          <div className="exercises-content">
            <h3>Recall Prompt</h3>
            <div className="exercise-item">
              <p>
                Type the English meaning of:{" "}
                <strong>{recallPrompt.newari_text}</strong>
              </p>
              {recallPrompt.romanized_text && (
                <p style={{ color: "#6c757d", marginTop: -4 }}>
                  Romanized hint: {recallPrompt.romanized_text}
                </p>
              )}
              <input
                value={recallInput}
                onChange={(e) => setRecallInput(e.target.value)}
                placeholder="Type in English"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
              {recallFeedback && (
                <p
                  style={{
                    color: recallFeedback.ok ? "#28a745" : "#dc3545",
                    marginTop: 10,
                  }}
                >
                  {recallFeedback.text}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="practice-next-btn" onClick={submitRecall}>
                Check Answer
              </button>
              <button
                className="practice-next-btn"
                onClick={continueAfterRecall}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {phase === "checkpoint" && currentCheckpointQuestion && (
          <div className="exercises-content">
            <h3>Unit Checkpoint</h3>
            <div className="exercise-item">
              <div className="question-text">
                Question {checkpointCurrent + 1} of {checkpointQuestions.length}
              </div>
              <p style={{ marginBottom: 16 }}>
                {currentCheckpointQuestion.question_text}
              </p>
              <div className="option-container">
                {OPTION_KEYS.map((key) => {
                  const text =
                    currentCheckpointQuestion[`option_${key.toLowerCase()}`];
                  let badge = null;
                  if (checkpointAnswered) {
                    if (key === currentCheckpointQuestion.correct_option) {
                      badge = <span className="correct-badge">Correct</span>;
                    } else if (key === checkpointSelected) {
                      badge = <span className="incorrect-badge">Wrong</span>;
                    }
                  }
                  return (
                    <label
                      key={key}
                      className="option-label"
                      onClick={() => submitCheckpointAnswer(key)}
                    >
                      <input
                        type="radio"
                        checked={checkpointSelected === key}
                        onChange={() => {}}
                        disabled={checkpointAnswered}
                      />
                      <span>
                        <strong>{key}.</strong> {text}
                      </span>
                      {badge}
                    </label>
                  );
                })}
              </div>
              {checkpointAnswered && currentCheckpointQuestion.explanation && (
                <div className="practice-explanation">
                  {currentCheckpointQuestion.explanation}
                </div>
              )}
            </div>

            {checkpointAnswered && (
              <button className="practice-next-btn" onClick={nextCheckpoint}>
                {checkpointCurrent + 1 === checkpointQuestions.length
                  ? "Finish Unit"
                  : "Next Question"}
              </button>
            )}
          </div>
        )}

        {phase === "checkpoint" && checkpointQuestions.length === 0 && (
          <p style={{ textAlign: "center", color: "#666" }}>
            No checkpoint available for this unit yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default Lessons;
