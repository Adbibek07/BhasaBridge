import React, { use, useState } from "react";
import "./Lessons.css";

const Lessons = () => {
  // State to track which lesson is selected (null = show curriculum)
  const [selectedLesson, setSelectedLesson] = useState(null);

  // State to track which tab is active (reading or exercises)
  const [activeTab, setActiveTab] = useState("reading");

  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleWordHover = (e, word, translation) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    setHoveredWord({ word, translation });
    setTooltipPos({
      x: rect.left + scrollX + rect.width / 2 - 80,
      y: rect.bottom + scrollY + 10,
    });
  };

  const lessons = [
    {
      id: 1,
      number: 1,
      title: "Basic Greetings",
      description: "Learn how to greet people in Bhaktapur Newari.",
      content: {
        reading:
          "When you meet someone in Bhaktapur, you say Jwajalapa. It is a polite greeting. If you want to ask 'How are you?', you say Chhu du khabar?. When leaving, you might say Subhay.",
        exercises: [
          {
            id: 1,
            question: "What is the common greeting in Bhaktapur?",
            options: ["Jwajalapa", "Subhay", "Khwopa"],
            correctAnswer: 0,
          },
          {
            id: 2,
            question: "What does 'Subhay' mean?",
            options: ["Hello", "Thank you", "GoodBye"],
            correctAnswer: 2,
          },
        ],
      },
    },
  ];

  const HoverWord = ({ children, translation }) => (
    <span
      className="hover-word"
      onMouseEnter={(e) => handleWordHover(e, children, translation)}
      onMouseLeave={() => setHoveredWord(null)}
    >
      {children}
    </span>
  );

  const currentLesson = selectedLesson
    ? lessons.find((l) => l.id === selectedLesson)
    : null;

  // If a lesson is selected, show lesson detail view
  if (currentLesson) {
    return (
      <div className="lessons-container">
        {/* Header with back button and tabs */}
        <div className="lesson-header">
          <button onClick={() => setSelectedLesson(null)}>← Back</button>
          <div>
            <p>LESSON {currentLesson.number}</p>
            <h2>{currentLesson.title}</h2>
          </div>

          <div className="tabs">
            <button
              className={activeTab === "reading" ? "active" : ""}
              onClick={() => setActiveTab("reading")}
            >
              Reading
            </button>
            <button
              className={activeTab === "exercises" ? "active" : ""}
              onClick={() => setActiveTab("exercises")}
            >
              Exercises
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="lesson-content">
          {activeTab === "reading" ? (
            <div className="reading-content">
              <p>
                When you meet someone in Bhaktapur, you say
                <HoverWord translation="Hello/Namaste">Jwajalapa</HoverWord>. It
                is a polite greeting. If you want to ask 'How are you?', you say
                <HoverWord translation="How are you?">
                  Chhu du khabar?
                </HoverWord>
                . When leaving, you might say{" "}
                <HoverWord translation="Goodbye">Subhay</HoverWord>.
              </p>
              {hoveredWord && (
                <div
                  className="tooltip"
                  style={{
                    top: tooltipPos.y + "px",
                    left: tooltipPos.x + "px",
                  }}
                >
                  <div className="tooltip-content">
                    <strong>{hoveredWord.translation}</strong>
                    <p>{hoveredWord.word}</p>
                    <p className="click-hint">CLICK FOR DETAILS</p>
                  </div>
                </div>
              )}
              <button onClick={() => setActiveTab("exercises")}>
                Continue to Exercises →
              </button>
            </div>
          ) : (
            <div className="exercises-content">
              <h3>Practice Exercises</h3>
              {currentLesson.content.exercises.map((ex) => (
                <div key={ex.id} className="exercise-item">
                  <p className="question-text">
                    <strong>{ex.id}.</strong> {ex.question}
                  </p>
                  <div className="option-container">
                    {ex.options.map((options, index) => (
                      <label key={index} className="option-label">
                        <input
                          type="radio"
                          name={`question-${ex.id}`}
                          value={index}
                          checked={selectedAnswers[ex.id] === index}
                          onChange={() =>
                            setSelectedAnswers({
                              ...selectedAnswers,
                              [ex.id]: index,
                            })
                          }
                          disabled={submitted}
                        />
                        <span>{options}</span>
                        {submitted && index === ex.correctAnswer && (
                          <span className="correct-badge">✓</span>
                        )}
                        {submitted &&
                          selectedAnswers[ex.id] === index &&
                          index !== ex.correctAnswer && (
                            <span className="incorrect-badge">✗</span>
                          )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {!submitted ? (
                <button onClick={() => setSubmitted(true)}>
                  Check Answers
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setSelectedAnswers({});
                  }}
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Otherwise, show curriculum view
  return (
    <div className="lessons-container">
      <div className="curriculum-header">
        <h1>Curriculum</h1>
        <p>A structured path to mastering the Bhaktapur dialect.</p>
      </div>

      <div className="lessons-grid">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="lesson-card">
            <div className="lesson-number">Lesson {lesson.number}</div>
            <h3>{lesson.title}</h3>
            <p>{lesson.description}</p>
            <button onClick={() => setSelectedLesson(lesson.id)}>
              Start Lesson
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lessons;
