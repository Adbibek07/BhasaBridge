import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Quiz.css";

const DIFFICULTIES = ["easy", "intermediate", "hard"];

const DIFFICULTY_META = {
  easy: {
    label: "Beginner",
    description: "Basic greetings, numbers, and everyday Newari words.",
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

const OPTION_KEYS = ["A", "B", "C", "D"];

const Quiz = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState("hub");
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [studyGuide, setStudyGuide] = useState(null);

  useEffect(() => {
    fetch("/api/progress/study-guide", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStudyGuide(data))
      .catch(() => setStudyGuide(null));
  }, []);

  useEffect(() => {
    if (!selectedDifficulty || mode !== "practice") return;

    const fetchQuiz = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/quizzes?level=${selectedDifficulty}&limit=100`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error("Failed to fetch quiz");
        const data = await res.json();

        const seen = new Set();
        const unique = data.filter((q) => {
          const key = q.question_text.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setQuestions(unique.sort(() => Math.random() - 0.5));
      } catch {
        setError("Could not load quiz. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [mode, selectedDifficulty]);

  const reviewUnlocked = Boolean(studyGuide?.review_unlocked);
  const reviewDue = studyGuide?.review_due || 0;

  const resetPracticeRun = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
    setError("");
  };

  const openDifficultyMenu = () => {
    resetPracticeRun();
    setSelectedDifficulty(null);
    setQuestions([]);
    setMode("difficulty");
  };

  const handleDifficultySelect = (difficulty) => {
    setSelectedDifficulty(difficulty);
    resetPracticeRun();
    setMode("practice");
  };

  const handleAnswerSelect = (optionKey) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionKey);
    if (optionKey === questions[currentQuestion].correct_option) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion + 1 >= questions.length) {
      setShowResult(true);
      return;
    }

    setCurrentQuestion((prev) => prev + 1);
    setSelectedAnswer(null);
  };

  const handleRetry = () => {
    resetPracticeRun();
    setQuestions((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  if (mode === "hub") {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h1>Practice Hub</h1>
          <p>
            Choose the kind of practice you want right now: due review for
            memory, or free practice for extra exposure.
          </p>
        </div>

        <div className="quiz-mode-grid">
          <div className="quiz-mode-card review">
            <span className="quiz-mode-pill">Spaced Review</span>
            <h3>Review Loop</h3>
            <p>
              Work through items that are due now so the phrases you already met
              do not fade out of memory.
            </p>
            <div className="quiz-mode-meta">
              {reviewUnlocked
                ? `${reviewDue} item${reviewDue === 1 ? "" : "s"} due now`
                : "Unlocks after your first completed guided unit"}
            </div>
            <button
              onClick={() => navigate(reviewUnlocked ? "/review" : "/lessons")}
            >
              {reviewUnlocked ? "Open Review Loop" : "Start Guided Lesson"}
            </button>
          </div>

          <div className="quiz-mode-card practice">
            <span className="quiz-mode-pill">Extra Practice</span>
            <h3>Free Practice</h3>
            <p>
              Run a lightweight multiple-choice round by difficulty whenever you
              want more reps outside the guided curriculum.
            </p>
            <div className="quiz-mode-meta">
              Great for short warmups, confidence checks, and quick revision.
            </div>
            <button onClick={openDifficultyMenu}>Choose Practice Level</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "difficulty") {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <button className="quiz-back-link" onClick={() => setMode("hub")}>
            Back to Practice Hub
          </button>
          <h1>Free Practice</h1>
          <p>Pick a level and do a quick confidence round.</p>
        </div>

        <div className="difficulty-grid">
          {DIFFICULTIES.map((level) => {
            const meta = DIFFICULTY_META[level];
            return (
              <div
                key={level}
                className="difficulty-card"
                onClick={() => handleDifficultySelect(level)}
              >
                <span
                  className="quiz-status-chip"
                  style={{
                    background: `${meta.color}18`,
                    color: meta.color,
                  }}
                >
                  {meta.label}
                </span>
                <h3>{level.charAt(0).toUpperCase() + level.slice(1)}</h3>
                <p>{meta.description}</p>
                <button>Start Free Practice</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="quiz-container quiz-centered-state">
        <p>Loading your practice round...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-container quiz-centered-state">
        <p className="quiz-error-text">{error}</p>
        <button className="quiz-back-link" onClick={openDifficultyMenu}>
          Back to Levels
        </button>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="quiz-container quiz-centered-state">
        <p>No practice questions are available for this level yet.</p>
        <button className="quiz-back-link" onClick={openDifficultyMenu}>
          Back to Levels
        </button>
      </div>
    );
  }

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    const meta = DIFFICULTY_META[selectedDifficulty];
    return (
      <div className="quiz-container">
        <div className="quiz-result">
          <span
            className="quiz-status-chip"
            style={{ background: `${meta.color}18`, color: meta.color }}
          >
            {meta.label}
          </span>
          <h2>Free Practice Complete</h2>
          <div className="score">
            <span className="quiz-score-value">
              {score}/{questions.length}
            </span>
            <p>{percentage}% correct</p>
            <p className="quiz-note">
              {percentage >= 80
                ? "Strong round. You are ready to push into harder recall."
                : percentage >= 50
                  ? "Solid effort. Another short round or a guided unit will help."
                  : "Use guided lessons or due review first, then come back for another round."}
            </p>
          </div>

          <div className="result-actions">
            <button onClick={handleRetry}>Retry This Level</button>
            <button onClick={openDifficultyMenu}>Choose Another Level</button>
            <button onClick={() => setMode("hub")}>Back to Practice Hub</button>
          </div>
        </div>
      </div>
    );
  }

  const current = questions[currentQuestion];
  const meta = DIFFICULTY_META[selectedDifficulty];
  const optionMap = {
    A: current.option_a,
    B: current.option_b,
    C: current.option_c,
    D: current.option_d,
  };

  return (
    <div className="quiz-container">
      <div className="quiz-nav">
        <button onClick={openDifficultyMenu}>Back</button>
        <span className="quiz-nav-level" style={{ color: meta.color }}>
          {meta.label} Practice
        </span>
        <span className="quiz-nav-score">
          Score: {score}/{currentQuestion}
        </span>
      </div>

      <div className="quiz-progress">
        <div className="quiz-progress-track">
          <div
            className="quiz-progress-fill"
            style={{
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
              background: meta.color,
            }}
          />
        </div>
        <p>
          Question {currentQuestion + 1} of {questions.length}
        </p>
      </div>

      <div className="quiz-content">
        <div className="quiz-category">
          {selectedDifficulty.charAt(0).toUpperCase() +
            selectedDifficulty.slice(1)}{" "}
          Level
        </div>
        <h2>{current.question_text}</h2>

        <div className="quiz-options">
          {OPTION_KEYS.map((key) => {
            let className = "quiz-option";
            if (selectedAnswer !== null) {
              if (key === current.correct_option) className += " correct";
              else if (key === selectedAnswer) className += " incorrect";
            }

            return (
              <label
                key={key}
                className={className}
                onClick={() => handleAnswerSelect(key)}
              >
                <input
                  type="radio"
                  name="quiz-option"
                  checked={selectedAnswer === key}
                  onChange={() => {}}
                  disabled={selectedAnswer !== null}
                />
                <span>
                  <strong>{key}.</strong> {optionMap[key]}
                </span>
              </label>
            );
          })}
        </div>

        {selectedAnswer !== null && current.explanation && (
          <div className="quiz-explanation">{current.explanation}</div>
        )}

        <button
          className="next-button"
          disabled={selectedAnswer === null}
          onClick={handleNextQuestion}
        >
          {currentQuestion + 1 >= questions.length
            ? "See Results"
            : "Next Question"}
        </button>
      </div>
    </div>
  );
};

export default Quiz;
