import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ReviewLoop.css";

const OPTION_KEYS = ["A", "B", "C", "D"];

const emptySummary = {
  answered: 0,
  mastered: 0,
  in3days: 0,
  in7days: 0,
  tomorrow: 0,
};

const ReviewLoop = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [reviewLocked, setReviewLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [summary, setSummary] = useState(emptySummary);
  const [roundDone, setRoundDone] = useState(false);

  const currentItem = useMemo(
    () => items[currentIndex] || null,
    [items, currentIndex],
  );

  const loadDueItems = async () => {
    setLoading(true);
    setError("");
    setReviewLocked(false);
    setLockMessage("");
    try {
      const res = await fetch("/api/review/next?limit=20", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load review queue.");
      const data = await res.json();

      if (data.review_unlocked === false) {
        setItems([]);
        setReviewLocked(true);
        setLockMessage(
          data.message || "Complete your first lesson to unlock Review Loop.",
        );
        return;
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setFeedback(null);
      setRoundDone(false);
      setSummary(emptySummary);
    } catch {
      setError("Could not load your review queue right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDueItems();
  }, []);

  const submitAnswer = async (optionKey) => {
    if (selectedAnswer || !currentItem) return;

    const isCorrect = optionKey === currentItem.correct_option;
    setSelectedAnswer(optionKey);

    try {
      const res = await fetch("/api/review/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_id: currentItem.review_id,
          is_correct: isCorrect,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit answer.");
      const data = await res.json();

      let statusText = "Review again tomorrow";
      let statusClass = "tomorrow";

      if (data.mastered || data.status === "mastered") {
        statusText = "Mastered";
        statusClass = "mastered";
      } else if (data.next_due_days === 7) {
        statusText = "Review again in 7 days";
        statusClass = "d7";
      } else if (data.next_due_days === 3) {
        statusText = "Review again in 3 days";
        statusClass = "d3";
      }

      setSummary((prev) => ({
        answered: prev.answered + 1,
        mastered: prev.mastered + (statusClass === "mastered" ? 1 : 0),
        in3days: prev.in3days + (statusClass === "d3" ? 1 : 0),
        in7days: prev.in7days + (statusClass === "d7" ? 1 : 0),
        tomorrow: prev.tomorrow + (statusClass === "tomorrow" ? 1 : 0),
      }));

      const xpEarned = Number(data.xp_earned || 0);
      setFeedback({
        statusClass,
        statusText,
        explanation: currentItem.explanation,
        xpEarned,
      });
    } catch {
      setError("Could not submit this review answer. Please try again.");
      setSelectedAnswer(null);
    }
  };

  const nextItem = () => {
    if (!selectedAnswer) return;
    const isLast = currentIndex + 1 >= items.length;
    if (isLast) {
      setRoundDone(true);
      return;
    }

    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setFeedback(null);
  };

  if (loading) {
    return (
      <div className="review-loop-page">
        <div className="review-loop-card review-loop-loading">
          Loading your due review items...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-loop-page">
        <div className="review-loop-card review-loop-empty">
          <h2>Review Loop</h2>
          <p>{error}</p>
          <div className="review-loop-actions">
            <button className="review-btn primary" onClick={loadDueItems}>
              Try Again
            </button>
            <button
              className="review-btn ghost"
              onClick={() => navigate("/quiz")}
            >
              Go to Practice Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!items.length) {
    if (reviewLocked) {
      return (
        <div className="review-loop-page">
          <div className="review-loop-card review-loop-empty">
            <h2>Review Loop Locked</h2>
            <p>{lockMessage}</p>
            <p className="review-muted">
              Finish at least one guided lesson first, then review will unlock.
            </p>
            <div className="review-loop-actions">
              <button
                className="review-btn primary"
                onClick={() => navigate("/lessons")}
              >
                Start First Lesson
              </button>
              <button className="review-btn ghost" onClick={loadDueItems}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="review-loop-page">
        <div className="review-loop-card review-loop-empty">
          <h2>Review Loop</h2>
          <p>You have no due review items right now.</p>
          <p className="review-muted">
            Come back tomorrow, or do a free practice round now.
          </p>
          <div className="review-loop-actions">
            <button
              className="review-btn primary"
              onClick={() => navigate("/quiz")}
            >
              Open Practice Hub
            </button>
            <button className="review-btn ghost" onClick={loadDueItems}>
              Refresh Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (roundDone) {
    return (
      <div className="review-loop-page">
        <div className="review-loop-card review-loop-complete">
          <h2>Review Loop Complete</h2>
          <p className="review-muted">
            This round is finished. Nice consistency.
          </p>

          <div className="review-summary-grid">
            <div>
              <strong>{summary.answered}</strong>
              <span>answered</span>
            </div>
            <div>
              <strong>{summary.tomorrow}</strong>
              <span>tomorrow</span>
            </div>
            <div>
              <strong>{summary.mastered}</strong>
              <span>mastered</span>
            </div>
            <div>
              <strong>{summary.in3days}</strong>
              <span>in 3 days</span>
            </div>
            <div>
              <strong>{summary.in7days}</strong>
              <span>in 7 days</span>
            </div>
          </div>

          <div className="review-loop-actions">
            <button className="review-btn primary" onClick={loadDueItems}>
              Load More Due Items
            </button>
            <button
              className="review-btn ghost"
              onClick={() => navigate("/quiz")}
            >
              Go to Practice Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / items.length) * 100);
  const optionMap = {
    A: currentItem.option_a,
    B: currentItem.option_b,
    C: currentItem.option_c,
    D: currentItem.option_d,
  };

  return (
    <div className="review-loop-page">
      <div className="review-loop-head">
        <div>
          <h1>Review Loop</h1>
          <p>
            Keep your memory strong with spaced repetition from your due queue.
          </p>
        </div>
        <div className="review-loop-chip">Due now: {items.length}</div>
      </div>

      <div className="review-progress-wrap">
        <div className="review-progress-bar">
          <div style={{ width: `${progressPercent}%` }} />
        </div>
        <span>
          Item {currentIndex + 1} of {items.length}
        </span>
      </div>

      <div className="review-loop-card review-loop-question">
        <div className="review-item-meta">
          <span>{currentItem.level?.toUpperCase() || "REVIEW"}</span>
          <span>{currentItem.unit_title || "Core"}</span>
        </div>

        <h2>{currentItem.question_text}</h2>

        <div className="review-option-list">
          {OPTION_KEYS.map((key) => {
            let cls = "review-option";
            if (selectedAnswer) {
              if (key === currentItem.correct_option) cls += " correct";
              else if (key === selectedAnswer) cls += " incorrect";
            }

            return (
              <label
                key={key}
                className={cls}
                onClick={() => submitAnswer(key)}
              >
                <input
                  type="radio"
                  checked={selectedAnswer === key}
                  onChange={() => {}}
                  disabled={Boolean(selectedAnswer)}
                />
                <span>
                  <strong>{key}.</strong> {optionMap[key]}
                </span>
              </label>
            );
          })}
        </div>

        {feedback && (
          <div className={`review-feedback ${feedback.statusClass}`}>
            <p className="review-feedback-title">{feedback.statusText}</p>
            {feedback.xpEarned > 0 && (
              <p className="review-feedback-meta">
                +{feedback.xpEarned} XP earned
              </p>
            )}
            {feedback.explanation && (
              <p className="review-feedback-meta">{feedback.explanation}</p>
            )}
          </div>
        )}

        {selectedAnswer && (
          <div className="review-loop-actions">
            <button className="review-btn primary" onClick={nextItem}>
              {currentIndex + 1 >= items.length
                ? "Finish Review Loop"
                : "Next Item"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewLoop;
