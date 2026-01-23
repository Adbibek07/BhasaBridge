from flask import Blueprint,request,jsonify
from db import connect_db
import bcrypt
import sqlite3
import re
from token_generater.token_gen import generate_pasword_reset_token
import jwt
from flask import current_app


auth = Blueprint('auth',__name__)

@auth.route('/register',methods=['POST'])
def register():
	name_reg = r"[A-Za-z\s\'-]{2,20}$"
	data = request.json
	name = data['Name']
	email = data['Email Id']
	password = data['Password']
	hash_password = bcrypt.hashpw(password.encode(),bcrypt.gensalt()).decode()
	email_reg = r'^[\w]+\@[A-Za-z]{2,10}\.[A-Za-z]+$'	
	if not re.fullmatch(name_reg,name):
		return jsonify({'Status':'Invalid Name syntax'}),400
	if not re.fullmatch(email_reg,email):
		return jsonify({'Status':'Invalid email syntax'}),400
	try:
		with connect_db() as db:
			db.execute("INSERT INTO users(name,email,password) VALUES (?,?,?)",(name,email,hash_password))

			db.commit()
		return jsonify({'Status':'Registered'}),201
	except sqlite3.IntegrityError:
		return jsonify({'Status':'User already registered'}),409
	except Exception as e:
		return jsonify({'Status':'Error'}),500




@auth.route('/login',methods=['POST'])
def login():
	data = request.json
	email = data['Email Id']
	email_reg = r"^[\w]+\@[A-Za-z]{2,10}\.[A-Za-z]+$"	

	password = data['Password']
	if not re.fullmatch(email_reg,email):
		return jsonify({'Status':'Invalid email syntax'}),400
	try:
		with connect_db() as db:
			cursor = db.execute("SELECT id,password FROM users WHERE email=?",(email,))
			user = cursor.fetchone()
		if user and bcrypt.checkpw(password.encode(),user[1].encode()):
			return jsonify({'Status':'Login Sucess'}),200
		else:
			return jsonify({'Status':'Invalid Credentials'}),401
	except Exception as e:
		return jsonify({'Status':'Error'}),500
	
@auth.route('/request_reset',methods=['POST'])
def request_reset():
	data = request.json
	email = data['Email Id']
	email_reg = r"^[\w]+\@[A-Za-z]{2,10}\.[A-Za-z]+$"
	if not re.fullmatch(email_reg,email):
		return jsonify({'Status':'Invalid Email Syntax'}),400
	try:
		with connect_db() as db:
			cursor = db.execute("SELECT id FROM USERS WHERE email=?",(email,))
			user = cursor.fetchone()
			if not user:
				return jsonify({'Status':'No user with this email'}),404
			user_id = user[0]
			token  = generate_pasword_reset_token(user_id)
			return jsonify({'Status':'Reset link generated','Token':token}),200
	except Exception as e:
		return jsonify({'Status':'Reset Link Generstion Failed','error':str(e)}),500
	

@auth.route('/reset_password',methods=['POST'])
def reset_pasword():
	data = request.json
	token = data['Token']
	new_password = data['New Password']

	if len(new_password)<6:
		return jsonify({'Status':'Password too Short'}),400
	try:
		payload = jwt.decode(token,current_app.config['SECRET_KEY'],algorithms='HS256')
	except jwt.ExpiredSignatureError:
		return jsonify({'Status':'Expired Token'}),400
	except jwt.InvalidTokenError:
		return jsonify({'Status':'Invalid Token'}),400
	user_id = payload['user_id']
	hash_password = bcrypt.hashpw(new_password.encode(),bcrypt.gensalt()).decode()
	try:
		with connect_db() as db:
			db.execute("UPDATE users SET password=? WHERE id=?",(hash_password, user_id))
			db.commit()
		return jsonify({'Status':'Password Reset Sucess'}),200
	except Exception as e:
		return jsonify({'Status':'Password RESET Failed'}),500
	
	