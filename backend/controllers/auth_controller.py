from flask import request, jsonify
import bcrypt
import sqlite3
import re
from config.database import connect_db


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
