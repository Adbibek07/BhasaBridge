import { Link } from "react-router-dom";
import "./landing.css";

function Landing() {
  return (
    <div className="landing-page">
      {/* Top Right Navigation */}
      <nav className="navbar">
        <div className="auth-buttons">
          <Link to="/login" className="login-link">Login</Link>
          <Link to="/login">
            <button className="register-btn">Register</button>
          </Link>
        </div>
      </nav>

      {/* Center Hero Content */}
      <main className="hero-content">
        <h1 className="hero-title">
          Welcome to <span className="brand-text">BhasaBridge</span>
        </h1>
        <p className="hero-subtitle">
          Learn Newari Language in a fun, structured, and interactive way.
        </p>

        <div className="cta-group">
          <Link to="/login">
            <button className="start-btn">Start Learning Now</button>
          </Link>
          <button className="curriculum-btn">View Curriculum</button>
        </div>
      </main>
    </div>
  );
}

export default Landing;