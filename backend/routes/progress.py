"""
Quiz progress & analytics routes
=================================
Session flow
------------
1. POST /api/quiz/session/start          – start a new session, get questions
2. POST /api/quiz/session/<id>/submit    – submit all answers, finalise session
3. POST /api/quiz/session/<id>/abandon   – mark session as abandoned

Progress (logged-in user)
-------------------------
GET /api/progress/me                     – overall stats
GET /api/progress/me/levels              – per-level breakdown
GET /api/progress/me/history             – paginated session history

Public
------
GET /api/leaderboard                     – top users by XP (public, login required)

Admin analytics
---------------
GET /api/admin/analytics                 – all users' stats summary
GET /api/admin/analytics/leaderboard     – top scorers per level
GET /api/admin/analytics/user/<user_id>  – specific user detail
"""

from flask import Blueprint, jsonify, request, session
import pymysql
from datetime import datetime, timedelta
from db import connect_db
from routes.login_required import login_required
from gamification import award_xp

progress = Blueprint('progress', __name__)

VALID_LEVELS = ['easy', 'intermediate', 'hard']


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _is_admin(cursor, user_id):
    cursor.execute('SELECT role FROM users WHERE id=%s', (user_id,))
    user = cursor.fetchone()
    return bool(user and user.get('role') == 'admin')


def _get_or_create_level_progress(cursor, user_id, level):
    """Return user_level_progress row, creating it if it doesn't exist."""
    cursor.execute(
        'SELECT id FROM user_level_progress WHERE user_id=%s AND level=%s',
        (user_id, level),
    )
    row = cursor.fetchone()
    if not row:
        cursor.execute(
            'INSERT INTO user_level_progress (user_id, level) VALUES (%s, %s)',
            (user_id, level),
        )
    return cursor.lastrowid


def _ensure_user_unit_progress(cursor, user_id, level):
    cursor.execute(
        '''
        SELECT unit_key, unit_title, MIN(sort_order) AS sort_order
        FROM lesson
        WHERE level=%s
        GROUP BY unit_key, unit_title
        ORDER BY sort_order ASC
        ''',
        (level,),
    )
    units = cursor.fetchall()
    if not units:
        return []

    for index, unit in enumerate(units):
        cursor.execute(
            '''
            INSERT INTO user_unit_progress (user_id, level, unit_key, unit_title, is_unlocked)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE unit_title=VALUES(unit_title)
            ''',
            (user_id, level, unit['unit_key'], unit['unit_title'], 1 if index == 0 else 0),
        )

    return units


# ---------------------------------------------------------------------------
# GET /api/leaderboard  – public top-users board (login required)
# ---------------------------------------------------------------------------
@progress.route('/leaderboard', methods=['GET'])
@login_required
def leaderboard():
    """Top 10 users ranked by XP, with streak and level."""
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')
        cursor.execute(
            '''
            SELECT name,
                   COALESCE(xp, 0)     AS xp,
                   COALESCE(streak, 0) AS streak,
                   COALESCE(level, 1)  AS level
            FROM users
            ORDER BY xp DESC, streak DESC
            LIMIT 10
            '''
        )
        rows = cursor.fetchall()
        return jsonify(rows), 200
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# POST /api/quiz/session/start
# ---------------------------------------------------------------------------
@progress.route('/quiz/session/start', methods=['POST'])
@login_required
def start_session():
    """
    Body: { "level": "easy", "question_count": 5 }
    Returns the session id and the quiz questions (without correct_option).
    """
    data = request.json or {}
    level = data.get('level', '').lower()
    question_count = int(data.get('question_count', 5))

    if level not in VALID_LEVELS:
        return jsonify({'Status': 'level must be easy, intermediate, or hard'}), 400
    if not (1 <= question_count <= 20):
        return jsonify({'Status': 'question_count must be between 1 and 20'}), 400

    user_id = session['user_id']
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        # pick random questions for the requested level
        cursor.execute(
            '''
            SELECT id, level, question_text,
                   option_a, option_b, option_c, option_d, explanation
            FROM quiz
            WHERE level=%s
            ORDER BY RAND()
            LIMIT %s
            ''',
            (level, question_count),
        )
        questions = cursor.fetchall()

        if not questions:
            return jsonify({'Status': 'No quiz questions found for this level'}), 404

        # create session row
        cursor.execute(
            '''
            INSERT INTO quiz_sessions (user_id, level, total_questions)
            VALUES (%s, %s, %s)
            ''',
            (user_id, level, len(questions)),
        )
        conn.commit()
        session_id = cursor.lastrowid

        return jsonify({
            'session_id': session_id,
            'level': level,
            'total_questions': len(questions),
            'questions': questions,
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'Status': 'Error', 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@progress.route('/review/next', methods=['GET'])
@login_required
def review_next():
    user_id = session['user_id']
    limit = max(1, min(int(request.args.get('limit', 10)), 30))

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        cursor.execute(
            '''
            SELECT rq.id AS review_id,
                   rq.quiz_id,
                   rq.lesson_id,
                   rq.due_at,
                   rq.correct_streak,
                   rq.last_result,
                   q.level,
                   q.question_text,
                   q.option_a, q.option_b, q.option_c, q.option_d,
                   q.correct_option,
                   q.explanation,
                   l.unit_key,
                   l.unit_title,
                   l.english_text,
                   l.newari_text,
                   l.romanized_text
            FROM user_review_queue rq
            LEFT JOIN quiz q ON q.id = rq.quiz_id
            LEFT JOIN lesson l ON l.id = COALESCE(rq.lesson_id, q.lesson_id)
            WHERE rq.user_id=%s
              AND rq.is_mastered=0
              AND rq.due_at <= NOW()
            ORDER BY rq.due_at ASC
            LIMIT %s
            ''',
            (user_id, limit),
        )
        rows = cursor.fetchall()
        return jsonify({'count': len(rows), 'items': rows}), 200
    finally:
        cursor.close()
        conn.close()


@progress.route('/review/submit', methods=['POST'])
@login_required
def review_submit():
    user_id = session['user_id']
    data = request.json or {}
    review_id = data.get('review_id')
    is_correct = bool(data.get('is_correct'))

    if not review_id:
        return jsonify({'Status': 'review_id is required'}), 400

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        cursor.execute(
            'SELECT * FROM user_review_queue WHERE id=%s AND user_id=%s',
            (review_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'Status': 'Review item not found'}), 404

        current_streak = int(row.get('correct_streak') or 0)
        was_wrong_before = row.get('last_result') == 'wrong'

        if not is_correct:
            next_due = datetime.utcnow() + timedelta(days=1)
            cursor.execute(
                '''
                UPDATE user_review_queue
                SET correct_streak=0,
                    last_result='wrong',
                    due_at=%s,
                    is_mastered=0
                WHERE id=%s
                ''',
                (next_due, review_id),
            )
            conn.commit()
            return jsonify({'status': 'scheduled', 'next_due_days': 1, 'mastered': False}), 200

        next_streak = current_streak + 1
        if next_streak == 1:
            next_due = datetime.utcnow() + timedelta(days=3)
            cursor.execute(
                '''
                UPDATE user_review_queue
                SET correct_streak=1,
                    last_result='correct',
                    due_at=%s,
                    is_mastered=0
                WHERE id=%s
                ''',
                (next_due, review_id),
            )
            conn.commit()
            return jsonify({'status': 'scheduled', 'next_due_days': 3, 'mastered': False}), 200

        if next_streak == 2:
            next_due = datetime.utcnow() + timedelta(days=7)
            cursor.execute(
                '''
                UPDATE user_review_queue
                SET correct_streak=2,
                    last_result='correct',
                    due_at=%s,
                    is_mastered=0
                WHERE id=%s
                ''',
                (next_due, review_id),
            )
            conn.commit()
            return jsonify({'status': 'scheduled', 'next_due_days': 7, 'mastered': False}), 200

        cursor.execute(
            '''
            UPDATE user_review_queue
            SET correct_streak=%s,
                last_result='correct',
                is_mastered=1,
                due_at=DATE_ADD(NOW(), INTERVAL 365 DAY)
            WHERE id=%s
            ''',
            (next_streak, review_id),
        )
        conn.commit()

        reward = award_xp(user_id, 'quiz_complete') if was_wrong_before else {'xp_earned': 0}
        return jsonify({
            'status': 'mastered',
            'mastered': True,
            'xp_earned': reward.get('xp_earned', 0),
            'total_xp': reward.get('total_xp'),
            'streak': reward.get('streak'),
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'Status': 'Error', 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@progress.route('/progress/study-guide', methods=['GET'])
@login_required
def study_guide():
    user_id = session['user_id']
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        for lvl in VALID_LEVELS:
            _ensure_user_unit_progress(cursor, user_id, lvl)
        conn.commit()

        cursor.execute(
            '''
            SELECT COUNT(*) AS review_due
            FROM user_review_queue
            WHERE user_id=%s AND is_mastered=0 AND due_at <= NOW()
            ''',
            (user_id,),
        )
        review_due = int((cursor.fetchone() or {}).get('review_due') or 0)

        cursor.execute(
            '''
            SELECT l.level, l.unit_key, l.unit_title, COUNT(*) AS weak_count
            FROM user_review_queue rq
            LEFT JOIN quiz q ON q.id = rq.quiz_id
            LEFT JOIN lesson l ON l.id = COALESCE(rq.lesson_id, q.lesson_id)
            WHERE rq.user_id=%s AND rq.is_mastered=0
            GROUP BY l.level, l.unit_key, l.unit_title
            ORDER BY weak_count DESC
            LIMIT 4
            ''',
            (user_id,),
        )
        weak_topics = cursor.fetchall()

        cursor.execute(
            '''
            SELECT level, unit_key, unit_title, is_unlocked, is_completed, mastery_score, last_activity
            FROM user_unit_progress
            WHERE user_id=%s
            ORDER BY FIELD(level, 'easy', 'intermediate', 'hard'), is_completed ASC, last_activity DESC
            ''',
            (user_id,),
        )
        units = cursor.fetchall()

        continue_unit = next((u for u in units if u['is_unlocked'] and not u['is_completed']), None)
        new_lesson = next((u for u in units if not u['is_unlocked']), None)

        return jsonify({
            'continue_unit': continue_unit,
            'review_due': review_due,
            'new_lesson': new_lesson,
            'weak_topics': weak_topics,
            'units': units,
        }), 200
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# POST /api/quiz/session/<session_id>/submit
# ---------------------------------------------------------------------------
@progress.route('/quiz/session/<int:session_id>/submit', methods=['POST'])
@login_required
def submit_session(session_id):
    """
    Body: { "answers": [{"quiz_id": 1, "selected_option": "A"}, ...] }
    Marks each attempt, finalises score and updates aggregated progress.
    """
    data = request.json or {}
    answers = data.get('answers', [])
    user_id = session['user_id']

    if not answers:
        return jsonify({'Status': 'answers list is required'}), 400

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        # verify session belongs to user and is still in progress
        cursor.execute(
            'SELECT * FROM quiz_sessions WHERE id=%s AND user_id=%s',
            (session_id, user_id),
        )
        sess_row = cursor.fetchone()
        if not sess_row:
            return jsonify({'Status': 'Session not found'}), 404
        if sess_row['status'] != 'in_progress':
            return jsonify({'Status': f"Session already {sess_row['status']}"}), 409

        level = sess_row['level']

        # fetch correct answers for the submitted quiz ids
        quiz_ids = [a['quiz_id'] for a in answers if 'quiz_id' in a]
        if not quiz_ids:
            return jsonify({'Status': 'No valid quiz_id values in answers'}), 400

        fmt = ','.join(['%s'] * len(quiz_ids))
        cursor.execute(
            f'SELECT id, correct_option FROM quiz WHERE id IN ({fmt})',
            quiz_ids,
        )
        correct_map = {r['id']: r['correct_option'] for r in cursor.fetchall()}

        results = []
        correct_count = 0

        for ans in answers:
            qid = ans.get('quiz_id')
            selected = str(ans.get('selected_option', '')).upper()
            if qid not in correct_map or selected not in ('A', 'B', 'C', 'D'):
                continue

            is_correct = int(correct_map[qid] == selected)
            correct_count += is_correct

            # insert attempt (ignore duplicates – idempotent)
            cursor.execute(
                '''
                INSERT IGNORE INTO quiz_attempts
                    (session_id, user_id, quiz_id, selected_option, is_correct)
                VALUES (%s, %s, %s, %s, %s)
                ''',
                (session_id, user_id, qid, selected, is_correct),
            )

            results.append({
                'quiz_id': qid,
                'selected_option': selected,
                'correct_option': correct_map[qid],
                'is_correct': bool(is_correct),
            })

        total = sess_row['total_questions']
        score_percent = round((correct_count / total) * 100, 2) if total else 0

        # finalise session
        cursor.execute(
            '''
            UPDATE quiz_sessions
            SET correct_answers=%s,
                score_percent=%s,
                status='completed',
                completed_at=CURRENT_TIMESTAMP
            WHERE id=%s
            ''',
            (correct_count, score_percent, session_id),
        )

        # upsert aggregated level progress
        _get_or_create_level_progress(cursor, user_id, level)
        cursor.execute(
            '''
            UPDATE user_level_progress
            SET total_sessions           = total_sessions + 1,
                total_questions_answered = total_questions_answered + %s,
                total_correct            = total_correct + %s,
                best_score_percent       = GREATEST(best_score_percent, %s),
                last_played_at           = CURRENT_TIMESTAMP
            WHERE user_id=%s AND level=%s
            ''',
            (total, correct_count, score_percent, user_id, level),
        )

        conn.commit()

        return jsonify({
            'session_id': session_id,
            'level': level,
            'total_questions': total,
            'correct_answers': correct_count,
            'score_percent': score_percent,
            'results': results,
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'Status': 'Error', 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# POST /api/quiz/session/<session_id>/abandon
# ---------------------------------------------------------------------------
@progress.route('/quiz/session/<int:session_id>/abandon', methods=['POST'])
@login_required
def abandon_session(session_id):
    """Mark a session as abandoned (e.g. user navigated away)."""
    user_id = session['user_id']
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        cursor.execute(
            "UPDATE quiz_sessions SET status='abandoned' WHERE id=%s AND user_id=%s AND status='in_progress'",
            (session_id, user_id),
        )
        if cursor.rowcount == 0:
            return jsonify({'Status': 'Session not found or already finalised'}), 404
        conn.commit()
        return jsonify({'Status': 'Session abandoned'}), 200
    finally:
        cursor.close()
        conn.close()


# ===========================================================================
# USER PROGRESS ENDPOINTS
# ===========================================================================

# ---------------------------------------------------------------------------
# GET /api/progress/me  – overall stats
# ---------------------------------------------------------------------------
@progress.route('/progress/me', methods=['GET'])
@login_required
def my_overall_progress():
    """Overall quiz stats for the logged-in user."""
    user_id = session['user_id']
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        cursor.execute(
            '''
            SELECT
                u.name,
                u.email,
                COUNT(DISTINCT qs.id)                            AS total_sessions,
                COALESCE(SUM(qs.total_questions), 0)             AS total_questions_attempted,
                COALESCE(SUM(qs.correct_answers), 0)             AS total_correct,
                COALESCE(ROUND(AVG(qs.score_percent), 2), 0)     AS avg_score_percent,
                COALESCE(MAX(qs.score_percent), 0)               AS best_score_percent,
                MAX(qs.completed_at)                             AS last_played_at
            FROM users u
            LEFT JOIN quiz_sessions qs
                   ON qs.user_id = u.id AND qs.status = 'completed'
            WHERE u.id = %s
            GROUP BY u.id
            ''',
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'Status': 'User not found'}), 404
        return jsonify(row), 200
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/progress/me/levels  – per-level breakdown
# ---------------------------------------------------------------------------
@progress.route('/progress/me/levels', methods=['GET'])
@login_required
def my_level_progress():
    """Per-level aggregated progress for the logged-in user."""
    user_id = session['user_id']
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        cursor.execute(
            '''
            SELECT
                level,
                total_sessions,
                total_questions_answered,
                total_correct,
                CASE WHEN total_questions_answered > 0
                     THEN ROUND((total_correct / total_questions_answered) * 100, 2)
                     ELSE 0
                END AS overall_accuracy_percent,
                best_score_percent,
                last_played_at
            FROM user_level_progress
            WHERE user_id = %s
            ORDER BY FIELD(level, 'easy', 'intermediate', 'hard')
            ''',
            (user_id,),
        )
        rows = cursor.fetchall()
        return jsonify(rows), 200
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/progress/me/history  – paginated session history
# ---------------------------------------------------------------------------
@progress.route('/progress/me/history', methods=['GET'])
@login_required
def my_session_history():
    """
    Paginated list of completed quiz sessions for the logged-in user.
    Query params: level, status, limit (default 20), offset (default 0)
    """
    user_id = session['user_id']
    level   = request.args.get('level')
    status  = request.args.get('status')
    limit   = int(request.args.get('limit', 20))
    offset  = int(request.args.get('offset', 0))

    filters = ['qs.user_id = %s']
    params  = [user_id]
    if level:
        filters.append('qs.level = %s')
        params.append(level)
    if status:
        filters.append('qs.status = %s')
        params.append(status)

    where_clause = 'WHERE ' + ' AND '.join(filters)

    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        cursor.execute(
            f'''
            SELECT
                qs.id           AS session_id,
                qs.level,
                qs.total_questions,
                qs.correct_answers,
                qs.score_percent,
                qs.status,
                qs.started_at,
                qs.completed_at
            FROM quiz_sessions qs
            {where_clause}
            ORDER BY qs.started_at DESC
            LIMIT %s OFFSET %s
            ''',
            params + [limit, offset],
        )
        rows = cursor.fetchall()

        # per-session attempt detail (only the ids fetched)
        if rows:
            session_ids = [r['session_id'] for r in rows]
            fmt = ','.join(['%s'] * len(session_ids))
            cursor.execute(
                f'''
                SELECT
                    qa.session_id,
                    qa.quiz_id,
                    q.question_text,
                    qa.selected_option,
                    q.correct_option,
                    qa.is_correct,
                    qa.answered_at
                FROM quiz_attempts qa
                JOIN quiz q ON q.id = qa.quiz_id
                WHERE qa.session_id IN ({fmt})
                ORDER BY qa.answered_at ASC
                ''',
                session_ids,
            )
            attempts = cursor.fetchall()
            # group by session_id for easy consumption
            attempt_map = {}
            for a in attempts:
                attempt_map.setdefault(a['session_id'], []).append(a)
            for r in rows:
                r['attempts'] = attempt_map.get(r['session_id'], [])

        return jsonify(rows), 200
    finally:
        cursor.close()
        conn.close()


# ===========================================================================
# ADMIN ANALYTICS ENDPOINTS
# ===========================================================================

# ---------------------------------------------------------------------------
# GET /api/admin/analytics  – all users summary
# ---------------------------------------------------------------------------
@progress.route('/admin/analytics', methods=['GET'])
@login_required
def admin_analytics():
    """Admin: per-user quiz statistics summary."""
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        if not _is_admin(cursor, session['user_id']):
            return jsonify({'Status': 'forbidden'}), 403

        cursor.execute(
            '''
            SELECT
                u.id           AS user_id,
                u.name,
                u.email,
                u.role,
                COUNT(DISTINCT qs.id)                            AS total_sessions,
                COALESCE(SUM(qs.total_questions), 0)             AS total_questions_attempted,
                COALESCE(SUM(qs.correct_answers), 0)             AS total_correct,
                COALESCE(ROUND(AVG(qs.score_percent), 2), 0)     AS avg_score_percent,
                COALESCE(MAX(qs.score_percent), 0)               AS best_score_percent,
                MAX(qs.completed_at)                             AS last_played_at
            FROM users u
            LEFT JOIN quiz_sessions qs
                   ON qs.user_id = u.id AND qs.status = 'completed'
            GROUP BY u.id
            ORDER BY avg_score_percent DESC, total_sessions DESC
            '''
        )
        rows = cursor.fetchall()
        return jsonify(rows), 200
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/admin/analytics/leaderboard  – top scorers per level
# ---------------------------------------------------------------------------
@progress.route('/admin/analytics/leaderboard', methods=['GET'])
@login_required
def admin_leaderboard():
    """
    Admin: top 10 users per level ranked by best score, then accuracy.
    Query param: level (optional, returns all levels if omitted)
    """
    level = request.args.get('level')
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        if not _is_admin(cursor, session['user_id']):
            return jsonify({'Status': 'forbidden'}), 403

        extra_filter = 'AND ulp.level=%s' if level else ''
        params = [level] if level else []

        cursor.execute(
            f'''
            SELECT
                ulp.level,
                u.id           AS user_id,
                u.name,
                ulp.total_sessions,
                ulp.total_questions_answered,
                ulp.total_correct,
                CASE WHEN ulp.total_questions_answered > 0
                     THEN ROUND((ulp.total_correct / ulp.total_questions_answered) * 100, 2)
                     ELSE 0
                END AS overall_accuracy_percent,
                ulp.best_score_percent,
                ulp.last_played_at,
                RANK() OVER (
                    PARTITION BY ulp.level
                    ORDER BY ulp.best_score_percent DESC,
                             ulp.total_correct DESC
                ) AS rank_in_level
            FROM user_level_progress ulp
            JOIN users u ON u.id = ulp.user_id
            WHERE ulp.total_sessions > 0
            {extra_filter}
            ORDER BY FIELD(ulp.level, 'easy', 'intermediate', 'hard'), rank_in_level
            ''',
            params,
        )
        rows = cursor.fetchall()
        return jsonify(rows), 200
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/admin/analytics/user/<user_id>  – specific user full detail
# ---------------------------------------------------------------------------
@progress.route('/admin/analytics/user/<int:target_user_id>', methods=['GET'])
@login_required
def admin_user_detail(target_user_id):
    """Admin: full progress detail for a specific user."""
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        if not _is_admin(cursor, session['user_id']):
            return jsonify({'Status': 'forbidden'}), 403

        # user overview
        cursor.execute(
            '''
            SELECT
                u.id, u.name, u.email, u.role, u.created_at,
                COUNT(DISTINCT qs.id)                         AS total_sessions,
                COALESCE(SUM(qs.total_questions), 0)          AS total_questions_attempted,
                COALESCE(SUM(qs.correct_answers), 0)          AS total_correct,
                COALESCE(ROUND(AVG(qs.score_percent), 2), 0)  AS avg_score_percent,
                COALESCE(MAX(qs.score_percent), 0)            AS best_score_percent
            FROM users u
            LEFT JOIN quiz_sessions qs ON qs.user_id=u.id AND qs.status='completed'
            WHERE u.id=%s
            GROUP BY u.id
            ''',
            (target_user_id,),
        )
        user_row = cursor.fetchone()
        if not user_row:
            return jsonify({'Status': 'User not found'}), 404

        # per-level progress
        cursor.execute(
            '''
            SELECT level, total_sessions, total_questions_answered, total_correct,
                   CASE WHEN total_questions_answered > 0
                        THEN ROUND((total_correct / total_questions_answered) * 100, 2)
                        ELSE 0
                   END AS overall_accuracy_percent,
                   best_score_percent, last_played_at
            FROM user_level_progress
            WHERE user_id=%s
            ORDER BY FIELD(level, 'easy', 'intermediate', 'hard')
            ''',
            (target_user_id,),
        )
        level_progress = cursor.fetchall()

        # recent 10 sessions
        cursor.execute(
            '''
            SELECT id AS session_id, level, total_questions, correct_answers,
                   score_percent, status, started_at, completed_at
            FROM quiz_sessions
            WHERE user_id=%s
            ORDER BY started_at DESC
            LIMIT 10
            ''',
            (target_user_id,),
        )
        recent_sessions = cursor.fetchall()

        user_row['level_progress'] = level_progress
        user_row['recent_sessions'] = recent_sessions
        return jsonify(user_row), 200
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# GET /api/admin/analytics/quiz-stats  – per-question difficulty analysis
# ---------------------------------------------------------------------------
@progress.route('/admin/analytics/quiz-stats', methods=['GET'])
@login_required
def admin_quiz_stats():
    """
    Admin: per-question attempt counts and correct-rate (difficulty analysis).
    Query param: level (optional)
    """
    level = request.args.get('level')
    conn = connect_db()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('USE Bhasabridge')

        if not _is_admin(cursor, session['user_id']):
            return jsonify({'Status': 'forbidden'}), 403

        extra_filter = 'AND q.level=%s' if level else ''
        params = [level] if level else []

        cursor.execute(
            f'''
            SELECT
                q.id           AS quiz_id,
                q.level,
                q.question_text,
                COUNT(qa.id)                                     AS total_attempts,
                COALESCE(SUM(qa.is_correct), 0)                  AS correct_attempts,
                CASE WHEN COUNT(qa.id) > 0
                     THEN ROUND((SUM(qa.is_correct) / COUNT(qa.id)) * 100, 2)
                     ELSE NULL
                END AS correct_rate_percent
            FROM quiz q
            LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
            WHERE 1=1 {extra_filter}
            GROUP BY q.id
            ORDER BY FIELD(q.level, 'easy', 'intermediate', 'hard'),
                     correct_rate_percent ASC
            ''',
            params,
        )
        rows = cursor.fetchall()
        return jsonify(rows), 200
    finally:
        cursor.close()
        conn.close()
