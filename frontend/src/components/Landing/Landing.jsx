import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../NavigationBar/bhasabridge_logo.png";
import "./Landing.css";

const features = [
  {
    icon: "📖",
    title: "Structured Lessons",
    desc: "Learn Newari step by step with curated lessons",
  },
  {
    icon: "🧩",
    title: "Interactive Quizzes",
    desc: "Test your knowledge with fun, graded quizzes",
  },
  {
    icon: "📊",
    title: "Track Progress",
    desc: "Watch your streak grow and earn XP as you learn",
  },
  {
    icon: "🏆",
    title: "Gamification",
    desc: "Earn badges and climb the leaderboard",
  },
];

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <img src={Logo} alt="BhasaBridge Logo" />
          <span>
            <span style={{ color: "#fff" }}>Bhasa</span>
            <em style={{ color: "#5bbac6" }}>Bridge</em>
          </span>
        </div>
        <button className="landing-nav-btn" onClick={() => navigate("/login")}>
          Login
        </button>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-badge">🇳🇵 Learn Newari Language</div>
        <h1>
          Bridge the Gap with <span>Nepal Bhasa</span>
        </h1>
        <p>
          BhasaBridge makes learning Newari (Nepal Bhasa) fun and accessible.
          Master vocabulary, greetings, and everyday phrases through lessons,
          quizzes, and gamified progress tracking.
        </p>
        <div className="landing-cta-group">
          <button
            className="landing-btn-primary"
            onClick={() => navigate("/login", { state: { tab: "signup" } })}
          >
            Get Started — It's Free
          </button>
          <button
            className="landing-btn-secondary"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </div>
      </section>

      {/* Feature Cards */}
      <div className="landing-features">
        {features.map((f, i) => (
          <div className="landing-card" key={i}>
            <div className="landing-card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        © 2026 BhasaBridge — Preserving Nepal Bhasa, one lesson at a time.
      </footer>
    </div>
  );
}

export default LandingPage;
