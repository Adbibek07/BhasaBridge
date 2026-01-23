import jwt
import datetime

from flask import current_app

def generate_pasword_reset_token(user_id):
    payload = {
        'user_id':user_id,
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5)

    }
    token = jwt.encode(payload, current_app.config['SECRET_KEY'],algorithm = 'HS256')
    return token 