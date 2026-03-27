import React, { useState, useEffect } from "react";
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
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch quiz questions when difficulty is selected
  useEffect(() => {
    if (!selectedDifficulty) return;

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

        // ✅ Deduplicate by question_text (catches same question with different ids)
        const seen = new Set();
        const unique = data.filter((q) => {
          const key = q.question_text.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const shuffled = unique.sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
      } catch (e) {
        setError("Could not load quiz. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [selectedDifficulty]);

  const handleDifficultySelect = (difficulty) => {
    setSelectedDifficulty(difficulty);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
  };

  const handleAnswerSelect = (optionKey) => {
    if (selectedAnswer !== null) return; // already answered
    setSelectedAnswer(optionKey);
    if (optionKey === questions[currentQuestion].correct_option) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion + 1 >= questions.length) {
      setShowResult(true);
    } else {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
    // ✅ Re-shuffle without duplicates
    setQuestions((prev) => {
      const unique = [...new Map(prev.map((q) => [q.id, q])).values()];
      return unique.sort(() => Math.random() - 0.5);
    });
  };

  const handleBackToMenu = () => {
    setSelectedDifficulty(null);
    setQuestions([]);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
    setError("");
  };

  // ─── Difficulty Selection View ────────────────────────────────────────────
  if (!selectedDifficulty) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h1>Quiz</h1>
          <p style={{ color: "#6c757d", fontSize: "16px", marginTop: 8 }}>
            Test your knowledge of the Bhaktapur Newari dialect.
          </p>
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
                  style={{
                    display: "inline-block",
                    background: meta.color + "20",
                    color: meta.color,
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    marginBottom: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {meta.label}
                </span>
                <h3>{level.charAt(0).toUpperCase() + level.slice(1)}</h3>
                <p>{meta.description}</p>
                <button
                  style={{
                    background: "#103562",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  Start Quiz →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Loading / Error ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="quiz-container"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <p style={{ color: "#888", fontSize: "18px" }}>Loading quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="quiz-container"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <p style={{ color: "#dc3545", fontSize: "16px" }}>{error}</p>
        <button
          onClick={handleBackToMenu}
          style={{ marginTop: 16, cursor: "pointer" }}
        >
          Back to Menu
        </button>
      </div>
    );
  }

  // ─── Result View ──────────────────────────────────────────────────────────
  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    const meta = DIFFICULTY_META[selectedDifficulty];
    return (
      <div className="quiz-container">
        <div className="quiz-result">
          <h2>Quiz Complete! 🎉</h2>
          <p style={{ color: "#6c757d", marginBottom: 24 }}>
            {selectedDifficulty.charAt(0).toUpperCase() +
              selectedDifficulty.slice(1)}{" "}
            Level —{" "}
            <span style={{ color: meta.color, fontWeight: 600 }}>
              {meta.label}
            </span>
          </p>

          <div className="score">
            <span
              style={{ fontSize: "64px", fontWeight: 700, color: "#103562" }}
            >
              {score}/{questions.length}
            </span>
            <p style={{ fontSize: "20px", color: "#6c757d", marginTop: 8 }}>
              {percentage}% Score
            </p>
            <p style={{ marginTop: 12, fontSize: "16px" }}>
              {percentage >= 80
                ? "🌟 Excellent! You've mastered this level."
                : percentage >= 50
                  ? "👍 Good effort! Keep practicing."
                  : "📚 Keep studying and try again!"}
            </p>
          </div>

          <div className="result-actions">
            <button onClick={handleRetry}>Retry Quiz</button>
            <button onClick={handleBackToMenu}>Back to Menu</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Quiz Question View ───────────────────────────────────────────────────
  const current = questions[currentQuestion];

  if (!current) {
    return (
      <div
        className="quiz-container"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <p style={{ color: "#888", fontSize: "18px" }}>Loading question...</p>
      </div>
    );
  }
  const meta = DIFFICULTY_META[selectedDifficulty];
  const optionMap = {
    A: current.option_a,
    B: current.option_b,
    C: current.option_c,
    D: current.option_d,
  };

  return (
    <div className="quiz-container">
      {/* Top Nav Bar */}
      <div className="quiz-nav">
        <button onClick={handleBackToMenu}>← Back</button>
        <span style={{ color: meta.color, fontWeight: 600 }}>
          {meta.label} Level
        </span>
        <span style={{ color: "#6c757d" }}>
          Score: {score}/{currentQuestion}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="quiz-progress">
        <div
          style={{
            height: "6px",
            background: "#e0e0e0",
            borderRadius: "3px",
            margin: "0 40px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
              background: meta.color,
              borderRadius: "3px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <p
          style={{
            textAlign: "right",
            padding: "6px 40px 0",
            color: "#888",
            fontSize: "13px",
          }}
        >
          Question {currentQuestion + 1} of {questions.length}
        </p>
      </div>

      {/* Question */}
      <div className="quiz-content">
        <div className="quiz-category">
          {selectedDifficulty.charAt(0).toUpperCase() +
            selectedDifficulty.slice(1)}{" "}
          Level
        </div>
        <h2>{current.question_text}</h2>

        {/* Options */}
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

        {/* Explanation */}
        {selectedAnswer !== null && current.explanation && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              background: "#f0f7ff",
              borderLeft: "4px solid #103562",
              borderRadius: "6px",
              color: "#103562",
              fontSize: "14px",
            }}
          >
            💡 {current.explanation}
          </div>
        )}

        {/* Next Button */}
        <button
          className="next-button"
          disabled={selectedAnswer === null}
          onClick={handleNextQuestion}
          style={{
            marginTop: "24px",
            background: selectedAnswer ? "#103562" : "#ccc",
            color: "white",
            border: "none",
            padding: "12px 32px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: selectedAnswer ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          {currentQuestion + 1 >= questions.length
            ? "See Results"
            : "Next Question →"}
        </button>
      </div>
    </div>
  );
};

export default Quiz;
