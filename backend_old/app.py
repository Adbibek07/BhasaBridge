from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from config.database import init_db
from routes.auth import auth

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize database
init_db()

# Register blueprints
app.register_blueprint(auth, url_prefix='/api')

if __name__ == '__main__':
    app.run(debug=True)


