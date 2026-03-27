import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Zap, Flame, Trophy, BarChart2, Globe } from "lucide-react";
import "./Landing.css";

const features = [
  {
    Icon: BookOpen,
    title: "Structured Lessons",
    desc: "Three levels — Beginner, Intermediate, Advanced — each built around real Bhaktapur Newari phrases you'll actually use.",
    color: "#5bbac6",
  },
  {
    Icon: Zap,
    title: "Instant Quizzes",
    desc: "Test yourself the moment you learn. Quick-fire questions that bake vocabulary into long-term memory.",
    color: "#f4a261",
  },
  {
    Icon: Flame,
    title: "Daily Streaks",
    desc: "Five minutes a day is all it takes. Miss a day and your streak resets — that healthy pressure keeps you showing up.",
    color: "#e76f51",
  },
  {
    Icon: Trophy,
    title: "Earn Achievements",
    desc: "Unlock badges as you hit milestones. Climb the leaderboard. Every step forward is worth celebrating.",
    color: "#2a9d8f",
  },
  {
    Icon: BarChart2,
    title: "Track Progress",
    desc: "XP bars, level badges, session history — you always know exactly how far you've come.",
    color: "#9b5de5",
  },
  {
    Icon: Globe,
    title: "Living Heritage",
    desc: "Nepal Bhasa is listed as endangered. Every word you learn is a small act of preservation.",
    color: "#d4a843",
  },
];

const steps = [
  {
    num: "01",
    title: "Create Account",
    desc: "Set up your profile in seconds.",
  },
  {
    num: "02",
    title: "Choose a Level",
    desc: "Beginner, Intermediate, or Advanced.",
  },
  {
    num: "03",
    title: "Learn & Quiz",
    desc: "Study a lesson, then lock it in with a quiz.",
  },
  {
    num: "04",
    title: "Level Up",
    desc: "Earn XP, keep your streak, unlock badges.",
  },
];

const showcase = [
  { newari: "नमस्ते", roman: "Namaste", english: "Hello" },
  { newari: "धन्यवाद", roman: "Dhanyabad", english: "Thank You" },
  { newari: "खुसि", roman: "Khusi", english: "Happy" },
  { newari: "मि चाय्", roman: "Mi chāy", english: "I Want" },
  { newari: "बिज्याच्वनेगु", roman: "Bijyāchwanegu", english: "Welcome" },
];

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll(".aos").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lp">
      {/* ── Blobs ── */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <div className="lp-logo">
          <img src="/bhasabridge_logo.png" alt="BhasaBridge" />
          <span className="logo-text">
            <span className="logo-bhasa">Bhasa</span>
            <span className="logo-bridge">Bridge</span>
          </span>
        </div>
        <div className="lp-nav-actions">
          <button className="btn-ghost" onClick={() => navigate("/login")}>
            Login
          </button>
          <button
            className="btn-solid"
            onClick={() => navigate("/login", { state: { tab: "signup" } })}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="hero-bg-script" aria-hidden="true">
          नेपाल भाषा
        </div>
        <div className="hero-content">
          <p className="hero-eyebrow">The Easiest Way To Learn</p>
          <h1 className="hero-title">
            Learn Nepal Bhasa
            <br />
            <span className="hero-grad">without the struggle.</span>
          </h1>
          <p className="hero-sub">
            BhasaBridge turns language learning into an engaging adventure.
            Build your vocabulary with bite-sized lessons, interactive quizzes,
            and daily streaks designed for every level of learner.
          </p>
          <div className="hero-ctas">
            <button
              className="btn-primary"
              onClick={() => navigate("/login", { state: { tab: "signup" } })}
            >
              Start Learning <span className="hero-arrow">→</span>
            </button>
            <button className="btn-outline" onClick={() => navigate("/login")}>
              I already have an account
            </button>
          </div>
        </div>
        <div className="hero-scroll-hint">
          <span>Scroll</span>
          <div className="scroll-chevron" />
        </div>
      </section>

      {/* ── Word Showcase ── */}
      <section className="word-showcase aos">
        <p className="showcase-label">A taste of what you'll learn</p>
        <div className="showcase-track">
          {showcase.map((w, i) => (
            <div className="sc-card" key={i} style={{ "--i": i }}>
              <span className="sc-deva">{w.newari}</span>
              <span className="sc-roman">{w.roman}</span>
              <span className="sc-english">{w.english}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-features">
        <div className="sec-head aos">
          <p className="sec-eyebrow">Why BhasaBridge</p>
          <h2>Built for Nepal Bhasa, not for "any language"</h2>
          <p className="sec-sub">
            Most apps feel copy-pasted across languages. BhasaBridge is built
            specifically around the vocabulary, culture, and script of the Newar
            people.
          </p>
        </div>
        <div className="feat-grid">
          {features.map((f, i) => {
            const Icon = f.Icon;
            return (
              <div
                className="feat-card aos"
                key={i}
                style={{ "--accent": f.color, "--delay": `${i * 0.07}s` }}
              >
                <div className="feat-icon">
                  <Icon size={24} strokeWidth={1.6} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="feat-line" />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Culture Quote ── */}
      <section className="culture-section aos">
        <div className="culture-inner">
          <div className="culture-deco" aria-hidden="true">
            ❝
          </div>
          <p className="culture-deva">नेपाल भाषा — यथार्थतः व्यवहारेण जीवति।</p>
          <p className="culture-translation">
            "Nepal Bhasa truly lives in practice."
          </p>
          <p className="culture-note">
            Nepal Bhasa has been spoken in the Kathmandu Valley for over a
            thousand years. Today it is classified as{" "}
            <strong>vulnerable</strong> by UNESCO. Every learner helps keep it
            alive.
          </p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="how-section">
        <div className="sec-head aos">
          <p className="sec-eyebrow">How It Works</p>
          <h2>From zero to conversational, one step at a time</h2>
        </div>
        <div className="steps-row">
          {steps.map((s, i) => (
            <div
              className="step-card aos"
              key={i}
              style={{ "--delay": `${i * 0.1}s` }}
            >
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              {i < steps.length - 1 && <div className="step-connector" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section aos">
        <div className="cta-inner">
          <p className="cta-deva" aria-hidden="true">
            सुरू गर्नुहोस्
          </p>
          <h2>Ready to keep Nepal Bhasa alive?</h2>
          <p>
            Join learners reviving one of the Kathmandu Valley's most ancient
            languages, one meaningful conversation at a time.
          </p>
          <button
            className="btn-primary cta-btn"
            onClick={() => navigate("/login", { state: { tab: "signup" } })}
          >
            Create Your Account <span className="hero-arrow">→</span>
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img src="/bhasabridge_logo.png" alt="logo" height="34" />
            <span className="logo-text">
              <span className="logo-bhasa">Bhasa</span>
              <span className="logo-bridge">Bridge</span>
            </span>
          </div>
          <p className="footer-tag">
            Preserving Nepal Bhasa, one lesson at a time.
          </p>
          <p className="footer-copy">
            © {new Date().getFullYear()} BhasaBridge
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
