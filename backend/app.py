from flask import Flask
from db import init_db
from flask_cors import CORS
from routes.auth import auth
from dotenv import load_dotenv
import os


load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
CORS(app)


init_db()

app.register_blueprint(auth,url_prefix='/api')

if __name__ == '__main__':
	app.run(debug=True)


