from flask import request, jsonify
import bcrypt
import sqlite3
import re
import os
import secrets
import smtplib
from datetime import datetime, timedelta
from config.database import connect_db
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def register_user():
    """Register a new user"""
    data = request.json
    name = data.get('Name')
    email = data.get('Email Id')
    password = data.get('Password')
    
    if not all([name, email, password]):
        return jsonify({'Status': 'Missing required fields'}), 400
    
    # Regex validation (added from team member's code)
    name_reg = r"[A-Za-z\s\'-]{2,20}$"
    email_reg = r'^[\w]+\@[A-Za-z]{2,10}\.[A-Za-z]+$'
    
    if not re.fullmatch(name_reg, name):
        return jsonify({'Status': 'Invalid Name syntax'}), 400
    if not re.fullmatch(email_reg, email):
        return jsonify({'Status': 'Invalid email syntax'}), 400
    
    hash_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    
    try:
        with connect_db() as db:
            db.execute(
                "INSERT INTO users(name, email, password) VALUES (?, ?, ?)",
                (name, email, hash_password)
            )
            db.commit()
        return jsonify({'Status': 'Registered'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'Status': 'User already registered'}), 409
    except Exception as e:
        return jsonify({'Status': 'Error', 'message': str(e)}), 500


def login_user():
    """Login a user"""
    data = request.json
    email = data.get('Email Id')
    password = data.get('Password')
    
    if not all([email, password]):
        return jsonify({'Status': 'Missing required fields'}), 400
    
    # Regex validation for email (added from team member's code)
    email_reg = r"^[\w]+\@[A-Za-z]{2,10}\.[A-Za-z]+$"
    if not re.fullmatch(email_reg, email):
        return jsonify({'Status': 'Invalid email syntax'}), 400
    
    try:
        with connect_db() as db:
            cursor = db.execute(
                "SELECT id, password FROM users WHERE email=?",
                (email,)
            )
            user = cursor.fetchone()
        
        if user and bcrypt.checkpw(password.encode(), user[1].encode()):
            return jsonify({'Status': 'Login Success', 'userId': user[0]}), 200
        else:
            return jsonify({'Status': 'Invalid Credentials'}), 401
    except Exception as e:
        return jsonify({'Status': 'Error', 'message': str(e)}), 500


# Store reset tokens in memory (use Redis in production)
reset_tokens = {}


def send_email(recipient_email, subject, body_html):
    """Send email using SMTP"""
    try:
        sender_email = os.getenv('EMAIL_USER')
        sender_password = os.getenv('EMAIL_PASSWORD')
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        
        if not sender_email or not sender_password:
            return False, 'Email configuration missing'
        
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body_html, 'html'))
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
        
        return True, 'Email sent successfully'
    except Exception as e:
        print(f'Email error: {str(e)}')
        return False, f'Failed to send email: {str(e)}'


def forgot_password():
    """Step 1: Request password reset"""
    data = request.json
    email = data.get('Email Id')
    
    if not email:
        return jsonify({'Status': 'Email is required'}), 400
    
    # Validate email format
    email_reg = r"^[\w]+\@[A-Za-z]{2,10}\.[A-Za-z]+$"
    if not re.fullmatch(email_reg, email):
        return jsonify({'Status': 'Invalid email syntax'}), 400
    
    try:
        # Check if user exists
        with connect_db() as db:
            cursor = db.execute(
                "SELECT id FROM users WHERE email=?",
                (email,)
            )
            user = cursor.fetchone()
        
        if not user:
            return jsonify({'Status': 'Email not found in our system'}), 404
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        token_expiry = datetime.now() + timedelta(hours=1)
        
        # Store token with expiry
        reset_tokens[reset_token] = {
            'email': email,
            'expiry': token_expiry
        }
        
        # Create reset link
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Email body
        email_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Password Reset Request</h2>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <p><a href="{reset_link}" style="background-color: #0d4e82; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
                <p><strong>Or copy this token:</strong></p>
                <p style="background-color: #f0f8ff; padding: 10px; border-radius: 5px; font-family: monospace;">{reset_token}</p>
                <p style="color: #666;"><em>This link expires in 1 hour.</em></p>
                <p>If you didn't request this, you can safely ignore this email.</p>
            </body>
        </html>
        """
        
        # Send email
        success, message = send_email(email, 'Password Reset Request', email_body)
        
        if success:
            return jsonify({'Status': 'Reset instructions sent to your email!'}), 200
        else:
            return jsonify({'Status': message}), 500
    
    except Exception as e:
        return jsonify({'Status': 'Server error', 'message': str(e)}), 500


def reset_password():
    """Step 2: Reset password with token"""
    data = request.json
    token = data.get('token')
    new_password = data.get('Password')
    
    if not token or not new_password:
        return jsonify({'Status': 'Token and password are required'}), 400
    
    if len(new_password) < 6:
        return jsonify({'Status': 'Password must be at least 6 characters'}), 400
    
    try:
        # Verify token exists and hasn't expired
        if token not in reset_tokens:
            return jsonify({'Status': 'Invalid or expired token'}), 400
        
        token_data = reset_tokens[token]
        
        if datetime.now() > token_data['expiry']:
            del reset_tokens[token]
            return jsonify({'Status': 'Token has expired. Please request a new one'}), 400
        
        email = token_data['email']
        
        # Hash new password
        hash_password = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        
        # Update password in database
        with connect_db() as db:
            db.execute(
                "UPDATE users SET password=? WHERE email=?",
                (hash_password, email)
            )
            db.commit()
        
        # Delete used token
        del reset_tokens[token]
        
        return jsonify({'Status': 'Password reset successfully!'}), 200
    
    except Exception as e:
        return jsonify({'Status': 'Server error', 'message': str(e)}), 500
