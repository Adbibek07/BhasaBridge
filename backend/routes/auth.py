from flask import Blueprint,request,jsonify,session
import pymysql
from db import connect_db
import bcrypt
import re
from token_generater.token_gen import generate_password_reset_token
import jwt
from flask import current_app
from flask_mail import Message
from mail_server import mail
import os


auth = Blueprint('auth',__name__)

@auth.route('/register',methods=['POST'])
def register():
	name_reg = r"[A-Za-z\s\'-]{2,20}$"
	data = request.json
	name = data['Name']
	email = data['Email Id']
	password = data['Password']
	hash_password = bcrypt.hashpw(password.encode(),bcrypt.gensalt()).decode()
	email_reg = r'^[\w.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'	
	if not re.fullmatch(name_reg,name):
		return jsonify({'Status':'Invalid Name syntax'}),400
	if not re.fullmatch(email_reg,email):
		return jsonify({'Status':'Invalid email syntax'}),400
	conn = connect_db()
	try:
		cursor = conn.cursor(pymysql.cursors.DictCursor)
		cursor.execute("USE Bhasabridge")
		cursor.execute("INSERT INTO users(name,email,password) VALUES (%s,%s,%s)",(name,email,hash_password))
		conn.commit()
		return jsonify({'Status': 'Registered'}), 201
	except pymysql.err.IntegrityError as e:
		conn.rollback()
		if e.args[0] == 1062:  # Duplicate entry
			return jsonify({'Status':'User already registered'}), 409
		return jsonify({'Status':'Database error', 'error': str(e)}), 500
	finally:
		cursor.close()
		conn.close()




@auth.route('/login',methods=['POST'])
def login():
	data = request.json
	email = data['Email Id']
	email_reg = r'^[\w.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'	
	password = data['Password']
	if not re.fullmatch(email_reg,email):
		return jsonify({'Status':'Invalid email syntax'}),400
	conn = connect_db()
	try:
		cursor = conn.cursor(pymysql.cursors.DictCursor)
		cursor.execute("USE Bhasabridge")
		cursor.execute("SELECT id,password,name FROM users WHERE email=%s",(email,))
		user = cursor.fetchone()
	except Exception:
		return jsonify({'Status':'Error'}),500
	finally:
		cursor.close()
		conn.close()

	if user and bcrypt.checkpw(password.encode(),user['password'].encode()):
		session['user_id'] = user['id']
		session['user_name'] = user['name']
		return jsonify({'Status': 'Login Success', 'Username': user['name']}), 200
	return jsonify({'Status':'Invalid Credentials'}),401


@auth.route('/logout', methods=['POST'])
def logout():
	session.clear()
	return jsonify({'Status': 'Logged out'}), 200
	
@auth.route('/request_reset',methods=['POST'])
def request_reset():
	data = request.json
	email = data['Email Id']
	email_reg = r'^[\w.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
	if not re.fullmatch(email_reg,email):
		return jsonify({'Status':'Invalid Email Syntax'}),400
	conn = connect_db()
	try:
		cursor = conn.cursor(pymysql.cursors.DictCursor)
		cursor.execute("USE Bhasabridge")
		cursor.execute("SELECT id FROM users WHERE email=%s",(email,))
		user = cursor.fetchone()
	finally:
		cursor.close()
		conn.close()

	if not user:
		return jsonify({'Status':'No user with this email'}),404

	try:
		user_id = user['id']
		token = generate_password_reset_token(user_id)
		msg = Message(
			subject="Password Reset Request",
			sender=os.getenv('MAIL_USERNAME'),
			recipients=[email],
		)
		msg.body = f"""Hello,

Your token to reset your password is:

{token}

It expires in 5 minutes. If you did not request a password reset, please ignore this email.
"""
		mail.send(msg)
		return jsonify({'Status':'Reset password email sent'}),200
	except Exception as e:
		return jsonify({'Status': 'Reset Link Generation Failed', 'error': str(e)}), 500
	

@auth.route('/reset_password',methods=['POST'])
def reset_password():
	data = request.json
	token = data['Token']
	new_password = data['New Password']

	if len(new_password) < 6:
		return jsonify({'Status':'Password too Short'}),400
	try:
		payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
	except jwt.ExpiredSignatureError:
		return jsonify({'Status':'Expired Token'}),400
	except jwt.InvalidTokenError:
		return jsonify({'Status':'Invalid Token'}),400

	user_id = payload['user_id']
	hash_password = bcrypt.hashpw(new_password.encode(),bcrypt.gensalt()).decode()
	conn = connect_db()
	try:
		cursor = conn.cursor(pymysql.cursors.DictCursor)
		cursor.execute("USE Bhasabridge")
		cursor.execute("UPDATE users SET password=%s WHERE id=%s",(hash_password, user_id))
		conn.commit()
		return jsonify({'Status': 'Password Reset Success'}), 200
	except Exception:
		conn.rollback()
		return jsonify({'Status': 'Password Reset Failed'}), 500
	finally:
		cursor.close()
		conn.close()
