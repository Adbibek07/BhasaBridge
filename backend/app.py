from flask import Flask
from db import init_db
from flask_cors import CORS
from routes.auth import auth
from routes.progress import progress
from routes.gamification import gamification
from dotenv import load_dotenv
from mail_server import init_mail
import os
import pymysql
from quiz.quiz import quiz


load_dotenv()


app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'change-me-in-production'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
CORS(app)

init_mail(app)

try:
    init_db()
    print("Database initialized successfully!")
except pymysql.err.OperationalError as e:
    print("Database connection failed:", e)

app.register_blueprint(auth,         url_prefix='/api')
app.register_blueprint(quiz,         url_prefix='/api')
app.register_blueprint(progress,     url_prefix='/api')
app.register_blueprint(gamification, url_prefix='/api')

if __name__ == '__main__':
	app.run(debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')


