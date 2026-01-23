import sqlite3
import os

# Database configuration
DB_NAME = 'users.db'
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), DB_NAME)


def connect_db():
    """Connect to the SQLite database"""
    return sqlite3.connect(DB_PATH)


def init_db():
    """Initialize the database with required tables"""
    with connect_db() as db:
        db.execute('''
            CREATE TABLE IF NOT EXISTS users(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()
