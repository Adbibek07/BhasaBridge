from flask import Blueprint,jsonify,request,session
from db import connect_db
import pymysql
from routes.login_required import login_required
import random

quiz = Blueprint('quiz',__name__)

VALID_LESSON_LEVELS = ['easy', 'intermediate', 'hard']
VALID_ITEM_TYPES = ['word', 'sentence']
VALID_OPTIONS = ['A', 'B', 'C', 'D']


def _is_admin(cursor, user_id):
    cursor.execute('SELECT role FROM users WHERE id=%s', (user_id,))
    user = cursor.fetchone()
    return bool(user and user.get('role') == 'admin')


def _validate_lesson_payload(data):
    required_fields = ['level', 'item_type', 'english_text', 'newari_text']
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            return f'{field} is required'
    if data['level'] not in VALID_LESSON_LEVELS:
        return 'level must be easy, intermediate, or hard'
    if data['item_type'] not in VALID_ITEM_TYPES:
        return 'item_type must be word or sentence'
    if data.get('unit_key') and len(str(data.get('unit_key')).strip()) > 64:
        return 'unit_key must be 64 chars or fewer'
    if data.get('unit_title') and len(str(data.get('unit_title')).strip()) > 120:
        return 'unit_title must be 120 chars or fewer'
    return None


def _validate_quiz_payload(data):
    required_fields = [
        'level', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option'
    ]
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            return f'{field} is required'
    if data['level'] not in VALID_LESSON_LEVELS:
        return 'level must be easy, intermediate, or hard'
    if str(data['correct_option']).upper() not in VALID_OPTIONS:
        return 'correct_option must be A, B, C, or D'
    return None

@quiz.route('/lessons', methods=['GET'])
def list_lessons():
    level = request.args.get('level')
    item_type = request.args.get('item_type')
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))

    filters = []
    params = []
    if level:
        filters.append('level=%s')
        params.append(level)
    if item_type:
        filters.append('item_type=%s')
        params.append(item_type)

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ''

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        query = f'''
            SELECT id, level, item_type, unit_key, unit_title, sort_order, usage_note,
                   english_text, newari_text, romanized_text, source_url, created_at, updated_at
            FROM lesson
            {where_clause}
            ORDER BY FIELD(level, 'easy', 'intermediate', 'hard'), sort_order ASC, id ASC
            LIMIT %s OFFSET %s
        '''
        params.extend([limit, offset])
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return jsonify(rows), 200
    finally:
        cursor.close()
        conn.close()


@quiz.route('/lessons/units', methods=['GET'])
def list_units():
    level = request.args.get('level')

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        params = []
        where_clause = ''
        if level:
            where_clause = 'WHERE level=%s'
            params.append(level)

        cursor.execute(
            f'''
            SELECT level,
                   unit_key,
                   unit_title,
                   MIN(sort_order) AS sort_order,
                   MAX(usage_note) AS usage_note,
                   COUNT(*) AS total_items
            FROM lesson
            {where_clause}
            GROUP BY level, unit_key, unit_title
            ORDER BY FIELD(level, 'easy', 'intermediate', 'hard'), sort_order ASC, unit_title ASC
            ''',
            params,
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close()
        conn.close()


@quiz.route('/lessons/<int:lesson_id>', methods=['GET'])
def get_lesson_by_id(lesson_id):
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        cursor.execute(
            '''
            SELECT id, level, item_type, unit_key, unit_title, sort_order, usage_note,
                   english_text, newari_text, romanized_text, source_url, created_at, updated_at
            FROM lesson
            WHERE id=%s
            ''',
            (lesson_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'Status': 'Lesson not found'}), 404
        return jsonify(row), 200
    finally:
        cursor.close()
        conn.close()


@quiz.route('/admin/lessons', methods=['POST'])
@login_required
def add_lesson_admin():
    data = request.json or {}
    error = _validate_lesson_payload(data)
    if error:
        return jsonify({'Status': error}), 400

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        if not _is_admin(cursor, session['user_id']):
            return jsonify({'Status': 'forbidden'}), 403

        cursor.execute(
            '''
            INSERT INTO lesson (
                level, item_type, unit_key, unit_title, sort_order, usage_note,
                english_text, newari_text, romanized_text, source_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''',
            (
                data['level'],
                data['item_type'],
                (data.get('unit_key') or 'core').strip(),
                (data.get('unit_title') or 'Core Phrases').strip(),
                int(data.get('sort_order', 1)),
                (data.get('usage_note') or '').strip() or None,
                data['english_text'].strip(),
                data['newari_text'].strip(),
                (data.get('romanized_text') or '').strip() or None,
                (data.get('source_url') or 'https://www.easynepalityping.com/useful-newari-phrases').strip(),
            ),
        )
        conn.commit()
        return jsonify({'Status': 'Lesson added', 'id': cursor.lastrowid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'Status': 'Error', 'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@quiz.route('/admin/lessons/<int:lesson_id>', methods=['PUT'])
@login_required
def update_lesson_admin(lesson_id):
    data = request.json or {}
    error = _validate_lesson_payload(data)
    if error:
        return jsonify({'Status': error}), 400

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        if not _is_admin(cursor, session['user_id']):
            return jsonify({'Status': 'forbidden'}), 403

        cursor.execute(
            '''
            UPDATE lesson
            SET level=%s, item_type=%s, unit_key=%s, unit_title=%s, sort_order=%s, usage_note=%s,
                english_text=%s, newari_text=%s, romanized_text=%s, source_url=%s
            WHERE id=%s
            ''',
            (
                data['level'],
                data['item_type'],
                (data.get('unit_key') or 'core').strip(),
                (data.get('unit_title') or 'Core Phrases').strip(),
                int(data.get('sort_order', 1)),
                (data.get('usage_note') or '').strip() or None,
                data['english_text'].strip(),
                data['newari_text'].strip(),
                (data.get('romanized_text') or '').strip() or None,
                (data.get('source_url') or 'https://www.easynepalityping.com/useful-newari-phrases').strip(),
                lesson_id,
            ),
        )
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({'Status': 'Lesson not found'}), 404
        conn.commit()
        return jsonify({'Status': 'Lesson updated'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'Status': 'Error', 'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@quiz.route('/admin/lessons/<int:lesson_id>', methods=['DELETE'])
@login_required
def delete_lesson_admin(lesson_id):
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        if not _is_admin(cursor, session['user_id']):
            return jsonify({'Status': 'forbidden'}), 403

        cursor.execute('DELETE FROM lesson WHERE id=%s', (lesson_id,))
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({'Status': 'Lesson not found'}), 404
        conn.commit()
        return jsonify({'Status': 'Lesson deleted'}), 200
    finally:
        cursor.close()
        conn.close()


@quiz.route('/quizzes', methods=['GET'])
def list_quizzes():
    level = request.args.get('level')
    lesson_id = request.args.get('lesson_id')
    lesson_ids_raw = request.args.get('lesson_ids')  # comma-separated list of lesson IDs
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))

    filters = []
    params = []
    if level:
        filters.append('q.level=%s')
        params.append(level)
    if lesson_id:
        filters.append('q.lesson_id=%s')
        params.append(int(lesson_id))
    if lesson_ids_raw:
        try:
            lesson_ids = [int(x.strip()) for x in lesson_ids_raw.split(',') if x.strip().isdigit()]
            if lesson_ids:
                placeholders = ','.join(['%s'] * len(lesson_ids))
                filters.append(f'q.lesson_id IN ({placeholders})')
                params.extend(lesson_ids)
        except ValueError:
            pass

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ''

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        query = f'''
             SELECT q.id, q.level, q.lesson_id, l.english_text AS lesson_english_text,
                 l.newari_text AS lesson_newari_text,
                   q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                   q.correct_option, q.explanation, q.source_url, q.created_at, q.updated_at
            FROM quiz q
            LEFT JOIN lesson l ON l.id=q.lesson_id
            {where_clause}
            ORDER BY FIELD(q.level, 'easy', 'intermediate', 'hard'), q.id ASC
            LIMIT %s OFFSET %s
        '''
        params.extend([limit, offset])
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return jsonify(rows), 200
    finally:
        cursor.close()
        conn.close()


@quiz.route('/quizzes/<int:quiz_id>', methods=['GET'])
def get_quiz_by_id(quiz_id):
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        cursor.execute(
            '''
             SELECT q.id, q.level, q.lesson_id, l.english_text AS lesson_english_text,
                 l.newari_text AS lesson_newari_text,
                   q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                   q.correct_option, q.explanation, q.source_url, q.created_at, q.updated_at
            FROM quiz q
            LEFT JOIN lesson l ON l.id=q.lesson_id
            WHERE q.id=%s
            ''',
            (quiz_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'Status': 'Quiz not found'}), 404
        return jsonify(row), 200
    finally:
        cursor.close()
        conn.close()


@quiz.route('/admin/quizzes', methods=['POST'])
@login_required
def add_quiz_admin():
    data = request.json or {}
    error = _validate_quiz_payload(data)
    if error:
        return jsonify({'Status': error}), 400

    lesson_id = data.get('lesson_id')
    if lesson_id in ('', None):
        lesson_id = None

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        if not _is_admin(cursor, session['user_id']):
            return jsonify({'Status': 'forbidden'}), 403

        cursor.execute(
            '''
            INSERT INTO quiz (
                level, lesson_id, question_text, option_a, option_b, option_c, option_d,
                correct_option, explanation, source_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''',
            (
                data['level'],
                lesson_id,
                data['question_text'].strip(),
                data['option_a'].strip(),
                data['option_b'].strip(),
                data['option_c'].strip(),
                data['option_d'].strip(),
                str(data['correct_option']).upper(),
                (data.get('explanation') or '').strip() or None,
                (data.get('source_url') or 'https://www.easynepalityping.com/useful-newari-phrases').strip(),
            ),
        )
        conn.commit()
        return jsonify({'Status': 'Quiz added', 'id': cursor.lastrowid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'Status': 'Error', 'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@quiz.route('/admin/quizzes/<int:quiz_id>', methods=['PUT'])
@login_required
def update_quiz_admin(quiz_id):
    data = request.json or {}
    error = _validate_quiz_payload(data)
    if error:
        return jsonify({'Status': error}), 400

    lesson_id = data.get('lesson_id')
    if lesson_id in ('', None):
        lesson_id = None

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        if not _is_admin(cursor, session['user_id']):
            return jsonify({'Status': 'forbidden'}), 403

        cursor.execute(
            '''
            UPDATE quiz
            SET level=%s, lesson_id=%s, question_text=%s,
                option_a=%s, option_b=%s, option_c=%s, option_d=%s,
                correct_option=%s, explanation=%s, source_url=%s
            WHERE id=%s
            ''',
            (
                data['level'],
                lesson_id,
                data['question_text'].strip(),
                data['option_a'].strip(),
                data['option_b'].strip(),
                data['option_c'].strip(),
                data['option_d'].strip(),
                str(data['correct_option']).upper(),
                (data.get('explanation') or '').strip() or None,
                (data.get('source_url') or 'https://www.easynepalityping.com/useful-newari-phrases').strip(),
                quiz_id,
            ),
        )
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({'Status': 'Quiz not found'}), 404
        conn.commit()
        return jsonify({'Status': 'Quiz updated'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'Status': 'Error', 'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@quiz.route('/admin/quizzes/<int:quiz_id>', methods=['DELETE'])
@login_required
def delete_quiz_admin(quiz_id):
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        if not _is_admin(cursor, session['user_id']):
            return jsonify({'Status': 'forbidden'}), 403

        cursor.execute('DELETE FROM quiz WHERE id=%s', (quiz_id,))
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({'Status': 'Quiz not found'}), 404
        conn.commit()
        return jsonify({'Status': 'Quiz deleted'}), 200
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/quiz/random  – random questions (practice mode, no tracking)
# ---------------------------------------------------------------------------
@quiz.route('/quiz/random', methods=['GET'])
def get_random_quiz():
    """
    Return random quiz questions (no session tracking).
    Query params: level (required), count (default 5, max 20)
    Correct answers are hidden – suitable for frontend quiz practice UI.
    """
    level = (request.args.get('level') or '').lower()
    count = min(int(request.args.get('count', 5)), 20)

    if level not in VALID_LESSON_LEVELS:
        return jsonify({'Status': 'level must be easy, intermediate, or hard'}), 400

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        cursor.execute(
            '''
            SELECT id, level, question_text,
                   option_a, option_b, option_c, option_d
            FROM quiz
            WHERE level=%s
            ORDER BY RAND()
            LIMIT %s
            ''',
            (level, count),
        )
        rows = cursor.fetchall()
        return jsonify({'level': level, 'count': len(rows), 'questions': rows}), 200
    finally:
        cursor.close()
        conn.close()



