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

const buildRecallPrompts = (batch) => {
  const prompts = [];
  batch.forEach((item) => {
    prompts.push({
      id: `${item.id}-to-en`,
      lessonId: item.id,
      direction: "Nepal Bhasa -> English",
      promptText: item.newari_text,
      hintText: item.romanized_text
        ? `Romanized hint: ${item.romanized_text}`
        : "",
      placeholder: "Type in English",
      expected: item.english_text,
      acceptedAnswers: [normalizeText(item.english_text)].filter(Boolean),
    });

    prompts.push({
      id: `${item.id}-from-en`,
      lessonId: item.id,
      direction: "English -> Nepal Bhasa or Romanized",
      promptText: item.english_text,
      hintText: "You can answer in script or romanized form.",
      placeholder: "Type Nepal Bhasa or romanized",
      expected: [item.newari_text, item.romanized_text]
        .filter(Boolean)
        .join(" / "),
      acceptedAnswers: [
        normalizeText(item.newari_text),
        normalizeText(item.romanized_text),
      ].filter(Boolean),
    });
  });
  return prompts;
};

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
  const [recallPrompts, setRecallPrompts] = useState([]);
  const [recallCurrent, setRecallCurrent] = useState(0);
  const [recallPenalized, setRecallPenalized] = useState([]);
  const [recallInput, setRecallInput] = useState("");
  const [recallFeedback, setRecallFeedback] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [reviewItemsAdded, setReviewItemsAdded] = useState(0);
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

  const currentRecallPrompt = recallPrompts[recallCurrent] || null;

  const currentCheckpointQuestion =
    checkpointQuestions[checkpointCurrent] || null;

  const resetUnitFlow = () => {
    setError("");
    setPhase("intro");
    setBatchIndex(0);
    setRecallPrompts([]);
    setRecallCurrent(0);
    setRecallPenalized([]);
    setRecallInput("");
    setRecallFeedback(null);
    setMistakes(0);
    setReviewItemsAdded(0);
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

  const startRecallBatch = () => {
    const prompts = buildRecallPrompts(currentBatch);
    setRecallPrompts(prompts);
    setRecallCurrent(0);
    setRecallPenalized([]);
    setRecallInput("");
    setRecallFeedback(null);
    setPhase("recall");
  };

  const completeCurrentUnit = async (completionMode = "checkpoint") => {
    let completion = null;

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
      completion = await res.json();
    } catch {
      completion = { xp_earned: 0, streak: 0, level: 1 };
    }

    let weakTopic = null;
    try {
      const guideRes = await fetch("/api/progress/study-guide", {
        credentials: "include",
      });
      if (guideRes.ok) {
        const guide = await guideRes.json();
        weakTopic = (guide?.weak_topics || [])[0] || null;
      }
    } catch {
      weakTopic = null;
    }

    const unitIndex = units.findIndex(
      (u) => u.unit_key === currentUnit?.unit_key,
    );
    const nextUnit = unitIndex >= 0 ? units[unitIndex + 1] || null : null;

    setCompleteResult({
      ...completion,
      completion_mode: completionMode,
      completed_unit_title: currentUnit?.unit_title || "Unit",
      next_unit: nextUnit
        ? {
            unit_key: nextUnit.unit_key,
            unit_title: nextUnit.unit_title,
            level: selectedLevel,
          }
        : null,
      review_items_added: reviewItemsAdded,
      weak_topic: weakTopic,
    });
    setStatsRefresh((n) => n + 1);
    setPhase("done");
  };

  const submitRecall = async () => {
    if (!currentRecallPrompt) return;
    const normalizedInput = normalizeText(recallInput);
    if (!normalizedInput) {
      setRecallFeedback({ ok: false, text: "Type an answer before checking." });
      return;
    }

    const ok = currentRecallPrompt.acceptedAnswers.some(
      (ans) => normalizedInput === ans,
    );

    if (ok) {
      setRecallFeedback({
        ok: true,
        text: "Correct. Move to the next prompt.",
      });
      return;
    }

    setRecallFeedback({
      ok: false,
      text: `Expected: ${currentRecallPrompt.expected}`,
    });

    const alreadyPenalized = recallPenalized.includes(currentRecallPrompt.id);
    if (alreadyPenalized) return;

    setRecallPenalized((prev) => [...prev, currentRecallPrompt.id]);
    setMistakes((m) => m + 1);

    try {
      const res = await fetch("/api/lesson/wrong_answer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: currentRecallPrompt.lessonId }),
      });
      if (res.ok) {
        const data = await res.json();
        setHearts(data.hearts ?? hearts);
        if (data.queued_for_review) {
          setReviewItemsAdded((n) => n + 1);
        }
      } else {
        setHearts((h) => Math.max(0, h - 1));
      }
    } catch {
      setHearts((h) => Math.max(0, h - 1));
    }
  };

  const nextRecallPrompt = async () => {
    if (!currentRecallPrompt || !recallFeedback?.ok) return;

    const isLastPrompt = recallCurrent + 1 >= recallPrompts.length;
    if (!isLastPrompt) {
      setRecallCurrent((n) => n + 1);
      setRecallInput("");
      setRecallFeedback(null);
      return;
    }

    await continueAfterRecall();
  };

  const continueAfterRecall = async () => {
    const isLastBatch =
      currentUnit && (batchIndex + 1) * BATCH_SIZE >= currentUnit.items.length;

    if (!isLastBatch) {
      setBatchIndex((b) => b + 1);
      setRecallPrompts([]);
      setRecallCurrent(0);
      setRecallPenalized([]);
      setRecallInput("");
      setRecallFeedback(null);
      setPhase("learn");
      return;
    }

    if (!currentUnit) return;
    const lessonIds = currentUnit.items.map((i) => i.id);
    try {
      const res = await fetch(
        `/api/quizzes?level=${selectedLevel}&lesson_ids=${lessonIds.join(",")}&unique_by_lesson=1&limit=8`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error();
      const rows = await res.json();
      const dedup = [];
      const seen = new Set();
      rows.forEach((q) => {
        const key = q.lesson_id
          ? `lesson-${q.lesson_id}`
          : normalizeText(q.question_text);
        if (!seen.has(key)) {
          seen.add(key);
          dedup.push(q);
        }
      });

      if (!dedup.length) {
        await completeCurrentUnit("recall_only");
        return;
      }

      setCheckpointQuestions(dedup.slice(0, 5));
      setCheckpointCurrent(0);
      setCheckpointSelected(null);
      setCheckpointAnswered(false);
      setPhase("checkpoint");
    } catch {
      setError(
        "Checkpoint unavailable. Finishing this unit with recall-only completion.",
      );
      await completeCurrentUnit("recall_only");
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
          if (data.queued_for_review) {
            setReviewItemsAdded((n) => n + 1);
          }
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

    await completeCurrentUnit("checkpoint");
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
            {phase === "recall" && "Batch Recall"}
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
              learn them in small batches, complete stricter recall in both
              directions, then pass a short checkpoint.
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
              <div key={item.id} className="word-row">
                <span className="word-row-english">{item.english_text}</span>
                <span className="word-row-newari newari-script">{item.newari_text}</span>
                <span className="word-row-roman">{item.romanized_text || "—"}</span>
              </div>
            ))}
            <button onClick={startRecallBatch}>Start Batch Recall</button>
          </div>
        )}

        {phase === "recall" && currentRecallPrompt && (
          <div className="exercises-content">
            <h3>Batch Recall</h3>
            <div className="exercise-item">
              <div className="question-text">
                Prompt {recallCurrent + 1} of {recallPrompts.length}
              </div>
              <p style={{ marginTop: -4, color: "var(--teal-dark)", fontWeight: 700 }}>
                {currentRecallPrompt.direction}
              </p>
              <p>
                Recall for: <strong className="newari-script">{currentRecallPrompt.promptText}</strong>
              </p>
              {currentRecallPrompt.hintText && (
                <p style={{ color: "var(--content-muted)", marginTop: -4 }}>
                  {currentRecallPrompt.hintText}
                </p>
              )}
              <input
                value={recallInput}
                onChange={(e) => setRecallInput(e.target.value)}
                placeholder={currentRecallPrompt.placeholder}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
              {recallFeedback && (
                <p className={recallFeedback.ok ? "recall-feedback-ok" : "recall-feedback-err"}>
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
                onClick={nextRecallPrompt}
                disabled={!recallFeedback?.ok}
              >
                {recallCurrent + 1 >= recallPrompts.length
                  ? "Finish Batch Recall"
                  : "Next Prompt"}
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
          <div className="exercises-content">
            <p style={{ textAlign: "center", color: "#666" }}>
              No checkpoint available for this unit. You can still finish with
              recall-only completion.
            </p>
            <button
              className="practice-next-btn"
              onClick={() => completeCurrentUnit("recall_only")}
            >
              Finish Unit from Recall
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lessons;
