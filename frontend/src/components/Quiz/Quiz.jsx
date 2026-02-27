import React, { useState } from "react";
import "./Quiz.css";

const Quiz = () => {
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const quizData = {
    easy: {
      title: "Easy",
      description: "These quizzes are for beginners",
      questions: [
        {
          id: 1,
          category: "Common Greetings",
          question: "Bhaktapur Newari word for 'Hello' is",
          options: ["Jwajalapa (ज्वाजलप)", "Subhay (सुभाय)", "Khwopa (ख्वोप)"],
          correctAnswer: 0,
        },
        {
          id: 2,
          category: "Common Words",
          question: "Nepalbhasa word for 'Thank you' is",
          options: [
            "Jwajalapa (ज्वाजलप)",
            "Subhay (सुभाय)",
            "Dhanyabad (धन्यवाद)",
          ],
          correctAnswer: 1,
        },
        {
          id: 3,
          category: "Common Words",
          question: "Which word means 'Goodbye'?",
          options: [
            "Chhu du khabar (छु दु खबर)",
            "Subhay (सुभाय)",
            "Jwajalapa (ज्वाजलप)",
          ],
          correctAnswer: 1,
        },
        {
          id: 4,
          category: "Greetings & Phrases",
          question: "What does 'Chhu du khabar?' mean?",
          options: ["What is your name?", "How are you?", "Where are you?"],
          correctAnswer: 1,
        },
        {
          id: 5,
          category: "Common Words",
          question: "Nepalbhasa word for 'Yes' is",
          options: ["Hoon (हुन)", "Na (न)", "Taa (ता)"],
          correctAnswer: 0,
        },
      ],
    },
  };

  const handleDifficultySelect = (difficulty) => {
    setSelectedDifficulty(difficulty);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
  };

  const handleAnswerSelect = (index) => {
    setSelectedAnswer(index);
  };

  const handleNextQuestion = () => {
    const currentQuiz = quizData[selectedDifficulty];
    if (
      selectedAnswer === currentQuiz.questions[currentQuestion].correctAnswer
    ) {
      setScore(score + 1);
    }

    if (currentQuestion + 1 < currentQuiz.questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setShowResult(true);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
  };

  // Difficulty selection view
  if (!selectedDifficulty) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h1>न्हासःलिसः कासा (Quiz)</h1>
        </div>

        <div className="difficulty-grid">
          <div
            className="difficulty-card"
            onClick={() => handleDifficultySelect("easy")}
          >
            <h3>Easy</h3>
            <p>These quizzes are for beginners</p>
          </div>

          <div className="difficulty-card disabled">
            <h3>Moderate</h3>
            <p>These would be revisions for many</p>
            <span className="coming-soon">Coming Soon</span>
          </div>

          <div className="difficulty-card disabled">
            <h3>Hard</h3>
            <p>Not hard really, but let's go through it!</p>
            <span className="coming-soon">Coming Soon</span>
          </div>
        </div>
      </div>
    );
  }

  const currentQuiz = quizData[selectedDifficulty];

  // Show result view
  if (showResult) {
    return (
      <div className="quiz-container">
        <div className="quiz-result">
          <h2>Quiz Complete!</h2>
          <p className="score">
            Your Score: {score} / {currentQuiz.questions.length}
          </p>
          <div className="result-actions">
            <button onClick={handleRetry}>Try Again</button>
            <button onClick={() => setSelectedDifficulty(null)}>
              Back to Difficulties
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz view
  return (
    <div className="quiz-container">
      <div className="quiz-nav">
        <button onClick={() => setSelectedDifficulty(null)}>← Back</button>
        <div className="quiz-progress">
          Question {currentQuestion + 1} of {currentQuiz.questions.length}
        </div>
      </div>

      <div className="quiz-content">
        <div className="quiz-category">
          {currentQuiz.questions[currentQuestion].category}
        </div>
        <h2>{currentQuiz.questions[currentQuestion].question}</h2>

        <div className="quiz-options">
          {currentQuiz.questions[currentQuestion].options.map(
            (option, index) => {
              const isCorrect =
                index === currentQuiz.questions[currentQuestion].correctAnswer;
              const isSelected = selectedAnswer === index;
              const showResult = selectedAnswer !== null;

              return (
                <label
                  key={index}
                  className={`quiz-option ${
                    showResult
                      ? isCorrect
                        ? "correct"
                        : isSelected
                          ? "incorrect"
                          : ""
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={index}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(index)}
                    disabled={showResult}
                  />
                  <span>{option}</span>
                </label>
              );
            },
          )}
        </div>

        <button
          className="next-button"
          onClick={handleNextQuestion}
          disabled={selectedAnswer === null}
        >
          {currentQuestion + 1 === currentQuiz.questions.length
            ? "Finish"
            : "Next Question"}
        </button>
      </div>
    </div>
  );
};

export default Quiz;
