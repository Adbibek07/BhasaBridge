import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginSignUp.css";
import ForgotPassword from "./ForgotPassword";
import Logo from "../NavigationBar/bhasabridge_logo.png";
import user_icon from "./person.png";
import email_icon from "./email.png";
import password_icon from "./password.png";

const LoginSignUp = () => {
  const navigate = useNavigate();
  const [action, setAction] = useState("Sign Up");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const resetMessage = () => setMessage("");

  const submitSignUp = async () => {
    resetMessage();
    if (!name || !email || !password) {
      setMessage("Please fill in Name, Email or Password.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          Name: name,
          "Email Id": email,
          Password: password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) {
        setMessage("Registered successfully! Please login.");
        setAction("Login");
        setPassword("");
        setName("");
      } else if (res.status === 409) {
        setMessage("User already registered.");
      } else {
        setMessage(data?.Status || "Registration failed.");
      }
    } catch (e) {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = async () => {
    resetMessage();
    if (!email || !password) {
      setMessage("Please fill in Email and Password.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ "Email Id": email, Password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 200) {
        // Save username and token to localStorage
        localStorage.setItem("username", data.Username || data.name || email);
        localStorage.setItem("token", data.token || data.Token || "");
        setMessage("Login successful! Redirecting...");
        // ✅ Fixed: Navigate to /dashboard instead of /
        setTimeout(() => navigate("/dashboard"), 500);
      } else if (res.status === 401) {
        setMessage("Invalid credentials.");
      } else {
        setMessage(data?.Status || "Login failed.");
      }
    } catch (e) {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={() => {
          setShowForgotPassword(false);
          setAction("Login");
        }}
      />
    );
  }

  return (
    <div className="login-page-wrapper">
      <div className="logo-section">
        <img src={Logo} alt="BhasaBridge Logo" className="login-logo" />
        <div className="logo-text">
          <span style={{ color: "#103562" }}>Bhasa</span>
          <span style={{ color: "#5bbac6" }}>Bridge</span>
        </div>
      </div>
      <div className="container">
        <div className="header">
          <div className="text">{action}</div>
          <div className="underline"></div>
        </div>

        {message && (
          <div
            style={{
              color: message.includes("successful") ? "green" : "#0d4e82",
              textAlign: "center",
              marginTop: 10,
              fontWeight: "500",
            }}
          >
            {message}
          </div>
        )}

        <div className="inputs">
          {action === "Sign Up" && (
            <div className="input">
              <img src={user_icon} alt="" />
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="input">
            <img src={email_icon} alt="" />
            <input
              type="email"
              placeholder="Email Id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input">
            <img src={password_icon} alt="" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {action === "Login" && (
          <div className="forgot-password">
            Lost Password?{" "}
            <span onClick={() => setShowForgotPassword(true)}>Click Here!</span>
          </div>
        )}

        <div className="submit-container">
          <div
            className={action === "Login" ? "submit gray" : "submit"}
            onClick={() => {
              if (loading) return;
              action === "Sign Up" ? submitSignUp() : setAction("Sign Up");
            }}
            style={{
              opacity: loading ? 0.7 : 1,
              pointerEvents: loading ? "none" : "auto",
            }}
          >
            {loading && action === "Sign Up" ? "Loading..." : "Sign Up"}
          </div>
          <div
            className={action === "Sign Up" ? "submit gray" : "submit"}
            onClick={() => {
              if (loading) return;
              action === "Login" ? submitLogin() : setAction("Login");
            }}
            style={{
              opacity: loading ? 0.7 : 1,
              pointerEvents: loading ? "none" : "auto",
            }}
          >
            {loading && action === "Login" ? "Loading..." : "Login"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSignUp;