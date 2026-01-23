import React, { useState } from 'react';
import './LoginSignUp.css';
import email_icon from './email.png';
import password_icon from './password.png';

const ForgotPassword = ({ onBack }) => {
  const [step, setStep] = useState(1); // 1: Email input, 2: Reset password
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Step 1: Request reset token
  const handleRequestReset = async () => {
    setMessage('');
    
    if (!email) {
      setMessage('Please enter your email.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/request_reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'Email Id': email })
      });
      
      const data = await res.json();

      if (res.ok) {
        setToken(data.Token);
        setMessage(`✅ Reset Token: ${data.Token}`);
        // Move to step 2 after 2 seconds
        setTimeout(() => {
          setStep(2);
          setMessage('');
        }, 2000);
      } else {
        setMessage(data?.Status || 'Failed to send reset email.');
      }
    } catch (e) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset password with token
  const handleResetPassword = async () => {
    setMessage('');
    
    if (!token) {
      setMessage('Please enter the reset token from your email.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setMessage('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/reset_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          Token: token,
          'New Password': newPassword 
        })
      });
      
      const data = await res.json();

      if (res.ok) {
        setMessage('Password reset successful! Redirecting to login...');
        setTimeout(() => {
          onBack(); // Go back to login
        }, 2000);
      } else {
        setMessage(data?.Status || 'Password reset failed.');
      }
    } catch (e) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container'>
      <div className="header">
        <div className="text">
          {step === 1 ? 'Forgot Password' : 'Reset Password'}
        </div>
        <div className="underline"></div>
      </div>

      {message && (
        <div style={{ 
          color: message.includes('✅') ? '#28a745' : '#0d4e82', 
          textAlign: 'center', 
          marginTop: 10,
          padding: '10px',
          borderRadius: '5px',
          backgroundColor: '#f0f8ff',
          fontSize: '14px'
        }}>
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
              placeholder='Enter your registered email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        ) : (
          // Step 2: Token and New Password
          <>
            <div className="input">
              <img src={email_icon} alt="" />
              <input
                type="text"
                placeholder='Enter reset token from email'
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="input">
              <img src={password_icon} alt="" />
              <input
                type="password"
                placeholder='New Password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="input">
              <img src={password_icon} alt="" />
              <input
                type="password"
                placeholder='Confirm New Password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
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
              style={{ 
                opacity: loading ? 0.7 : 1, 
                pointerEvents: loading ? 'none' : 'auto' 
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </div>
            <div 
              className="submit gray" 
              onClick={onBack}
              style={{ pointerEvents: loading ? 'none' : 'auto' }}
            >
              Back to Login
            </div>
          </>
        ) : (
          <>
            <div
              className="submit"
              onClick={handleResetPassword}
              style={{ 
                opacity: loading ? 0.7 : 1, 
                pointerEvents: loading ? 'none' : 'auto' 
              }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </div>
            <div 
              className="submit gray" 
              onClick={() => setStep(1)}
              style={{ pointerEvents: loading ? 'none' : 'auto' }}
            >
              Back
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;