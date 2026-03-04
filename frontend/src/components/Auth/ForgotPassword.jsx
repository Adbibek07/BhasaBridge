import React, { useState } from "react";
import "./LoginSignUp.css";
import email_icon from "./email.png";
import password_icon from "./password.png";

const ForgotPassword = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRequestReset = async () => {
    setMessage("");
    if (!email) {
      setMessage("Please enter your email.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/request_reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ "Email Id": email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(2);
        setMessage("Token sent to your email. It expires in 5 minutes.");
      } else {
        setMessage(data?.Status || "Failed to send reset email.");
      }
    } catch (e) {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setMessage("");
    if (!token) {
      setMessage("Please enter the reset token from your email.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setMessage("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/reset_password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ Token: token, "New Password": newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => onBack(), 2000);
      } else {
        setMessage(data?.Status || "Password reset failed.");
      }
    } catch (e) {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="container">
        <div className="header">
          <div className="text">
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </div>
          <div className="underline"></div>
        </div>

        {message && (
          <div
            style={{
              color: message.includes("✅") ? "#28a745" : "#c0392b",
              textAlign: "center",
              marginTop: 10,
              padding: "10px 20px",
              borderRadius: "5px",
              backgroundColor: message.includes("✅") ? "#eaffea" : "#fff0f0",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            {message}
          </div>
        )}

        <div className="inputs">
          {step === 1 ? (
            // Step 1: Email Input
            <div className="input">
              <img src={email_icon} alt="" />
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          ) : (
            // Step 2: Token + New Password
            <>
              <div style={{ padding: "0 40px", color: "#555", fontSize: "14px" }}>
                  Check your email <strong>{email}</strong> for the reset token.
              </div>

              <div className="input">
                <img src={email_icon} alt="" />
                <input
                  type="text"
                  placeholder="Paste token from email"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input">
                <img src={password_icon} alt="" />
                <input
                  type="password"
                  placeholder="New Password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input">
                <img src={password_icon} alt="" />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div style={{ padding: "0 40px", color: "#e67e22", fontSize: "14px" }}>
                Token expires in 5 minutes. Request a new one if needed.
              </div>
            </>
          )}
        </div>

        <div className="submit-container">
          {step === 1 ? (
            <>
              <div
                className="submit"
                onClick={handleRequestReset}
                style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? "none" : "auto" }}
              >
                {loading ? "Sending..." : "Send Token"}
              </div>
              <div
                className="submit gray"
                onClick={onBack}
                style={{ pointerEvents: loading ? "none" : "auto" }}
              >
                Back to Login
              </div>
            </>
          ) : (
            <>
              <div
                className="submit"
                onClick={handleResetPassword}
                style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? "none" : "auto" }}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </div>
              <div
                className="submit gray"
                onClick={() => { setStep(1); setMessage(""); }}
                style={{ pointerEvents: loading ? "none" : "auto" }}
              >
                Resend Token
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;