import sqlite3


DB = 'users.db'

def connect_db():
	return sqlite3.connect(DB)

def init_db():
	with connect_db() as db:
		db.execute('''
			CREATE TABLE IF NOT EXISTS users(
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT,
				email TEXT UNIQUE,
				password TEXT
				)
			''')
		db.commit()


