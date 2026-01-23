from flask import Blueprint
from controllers.auth_controller import register_user, login_user, forgot_password, reset_password

auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['POST'])
def register():
    return register_user()

@auth.route('/login', methods=['POST'])
def login():
    return login_user()

@auth.route('/forgot-password', methods=['POST'])
def forgot_pwd():
    return forgot_password()

@auth.route('/reset-password', methods=['POST'])
def reset_pwd():
    return reset_password()


