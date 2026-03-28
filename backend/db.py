import pymysql
import os
from quiz.seed_data import LESSON_SEED_DATA, QUIZ_SEED_DATA, SOURCE_URL, infer_unit_metadata

def connect_db():
	return pymysql.connect(
		host=os.getenv('DB_HOST'),
		user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        charset='utf8mb4'
	)


def _seed_lessons(cursor):
    seed_keys = []
    for item in LESSON_SEED_DATA:
        unit_meta = infer_unit_metadata(item['level'], item['english_text'])
        seed_keys.append((item['level'], item['item_type'], item['english_text']))
        cursor.execute(
            """
            INSERT INTO lesson (
                level, item_type, unit_key, unit_title, sort_order, usage_note,
                english_text, newari_text, romanized_text, source_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                unit_key = VALUES(unit_key),
                unit_title = VALUES(unit_title),
                sort_order = VALUES(sort_order),
                usage_note = VALUES(usage_note),
                romanized_text = VALUES(romanized_text),
                source_url = VALUES(source_url),
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                item['level'],
                item['item_type'],
                item.get('unit_key', unit_meta['unit_key']),
                item.get('unit_title', unit_meta['unit_title']),
                int(item.get('sort_order', unit_meta['sort_order'])),
                item.get('usage_note', unit_meta['usage_note']),
                item['english_text'],
                item['newari_text'],
                item.get('romanized_text'),
                SOURCE_URL,
            ),
        )

    # Keep curated lessons only for this source URL.
    # This prevents older low-quality seeded rows from lingering across schema updates.
    if seed_keys:
        placeholders = ','.join(['(%s,%s,%s)'] * len(seed_keys))
        flat_params = [x for row in seed_keys for x in row]
        cursor.execute(
            f'''
            DELETE FROM lesson
            WHERE source_url = %s
              AND (level, item_type, english_text) NOT IN ({placeholders})
            ''',
            [SOURCE_URL] + flat_params,
        )


def _seed_quizzes(cursor):
    for quiz in QUIZ_SEED_DATA:
        lesson_id = None
        # Try to find the specific lesson item this question is about
        linked = quiz.get('linked_english_text')
        if linked:
            cursor.execute(
                "SELECT id FROM lesson WHERE level=%s AND english_text=%s LIMIT 1",
                (quiz['level'], linked),
            )
            row = cursor.fetchone()
            if row:
                lesson_id = row['id']
        # Fallback: first lesson item of that level
        if lesson_id is None:
            cursor.execute(
                "SELECT id FROM lesson WHERE level=%s ORDER BY id ASC LIMIT 1",
                (quiz['level'],),
            )
            lesson_row = cursor.fetchone()
            lesson_id = lesson_row['id'] if lesson_row else None

        cursor.execute(
            """
            INSERT INTO quiz (
                level, lesson_id, question_text,
                option_a, option_b, option_c, option_d,
                correct_option, explanation, source_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                lesson_id = VALUES(lesson_id),
                option_a = VALUES(option_a),
                option_b = VALUES(option_b),
                option_c = VALUES(option_c),
                option_d = VALUES(option_d),
                correct_option = VALUES(correct_option),
                explanation = VALUES(explanation),
                source_url = VALUES(source_url),
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                quiz['level'],
                lesson_id,
                quiz['question_text'],
                quiz['option_a'],
                quiz['option_b'],
                quiz['option_c'],
                quiz['option_d'],
                quiz['correct_option'],
                quiz.get('explanation'),
                SOURCE_URL,
            ),
        )

def init_db():
    conn = connect_db()
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    cursor.execute("CREATE DATABASE IF NOT EXISTS Bhasabridge")
    cursor.execute("USE Bhasabridge")


    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('learner','admin') DEFAULT 'learner',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lesson (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level ENUM('easy', 'intermediate', 'hard') NOT NULL,
        item_type ENUM('word', 'sentence') NOT NULL,
        unit_key VARCHAR(64) NOT NULL DEFAULT 'core',
        unit_title VARCHAR(120) NOT NULL DEFAULT 'Core Phrases',
        sort_order INT NOT NULL DEFAULT 1,
        usage_note VARCHAR(500) NULL,
        english_text VARCHAR(500) NOT NULL,
        newari_text VARCHAR(500) NOT NULL,
        english_hash CHAR(64) GENERATED ALWAYS AS (SHA2(english_text, 256)) STORED,
        newari_hash CHAR(64) GENERATED ALWAYS AS (SHA2(newari_text, 256)) STORED,
        romanized_text VARCHAR(500) NULL,
        source_url VARCHAR(500) NOT NULL DEFAULT 'https://www.easynepalityping.com/useful-newari-phrases',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_lesson_unique (level, item_type, english_hash, newari_hash),
        INDEX idx_lesson_level_type (level, item_type),
        INDEX idx_lesson_level_unit_order (level, unit_key, sort_order, id)
    )
    """)

    lesson_columns = [
        ("unit_key", "VARCHAR(64) NOT NULL DEFAULT 'core'"),
        ("unit_title", "VARCHAR(120) NOT NULL DEFAULT 'Core Phrases'"),
        ("sort_order", "INT NOT NULL DEFAULT 1"),
        ("usage_note", "VARCHAR(500) NULL"),
    ]
    for col_name, col_def in lesson_columns:
        try:
            cursor.execute(f"ALTER TABLE lesson ADD COLUMN {col_name} {col_def}")
        except pymysql.err.OperationalError as e:
            if e.args[0] == 1060:
                pass
            else:
                raise
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level ENUM('easy', 'intermediate', 'hard') NOT NULL,
        lesson_id INT NULL,
        question_text VARCHAR(500) NOT NULL,
        question_hash CHAR(64) GENERATED ALWAYS AS (SHA2(question_text, 256)) STORED,
        option_a VARCHAR(300) NOT NULL,
        option_b VARCHAR(300) NOT NULL,
        option_c VARCHAR(300) NOT NULL,
        option_d VARCHAR(300) NOT NULL,
        correct_option ENUM('A', 'B', 'C', 'D') NOT NULL,
        explanation VARCHAR(600) NULL,
        source_url VARCHAR(500) NOT NULL DEFAULT 'https://www.easynepalityping.com/useful-newari-phrases',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_quiz_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id) ON DELETE SET NULL,
        UNIQUE KEY uq_quiz_level_question (level, question_hash),
        INDEX idx_quiz_level (level),
        INDEX idx_quiz_lesson (lesson_id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        level ENUM('easy', 'intermediate', 'hard') NOT NULL,
        total_questions INT NOT NULL DEFAULT 0,
        correct_answers INT NOT NULL DEFAULT 0,
        score_percent DECIMAL(5,2) DEFAULT 0.00,
        status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_session_user (user_id),
        INDEX idx_session_level (level),
        INDEX idx_session_status (status)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        user_id INT NOT NULL,
        quiz_id INT NOT NULL,
        selected_option ENUM('A', 'B', 'C', 'D') NOT NULL,
        is_correct TINYINT(1) NOT NULL DEFAULT 0,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_attempt_session FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
        CONSTRAINT fk_attempt_user  FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE CASCADE,
        CONSTRAINT fk_attempt_quiz  FOREIGN KEY (quiz_id)    REFERENCES quiz(id)          ON DELETE CASCADE,
        UNIQUE KEY uq_session_quiz (session_id, quiz_id),
        INDEX idx_attempt_user    (user_id),
        INDEX idx_attempt_session (session_id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_level_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        level ENUM('easy', 'intermediate', 'hard') NOT NULL,
        total_sessions INT NOT NULL DEFAULT 0,
        total_questions_answered INT NOT NULL DEFAULT 0,
        total_correct INT NOT NULL DEFAULT 0,
        best_score_percent DECIMAL(5,2) DEFAULT 0.00,
        last_played_at TIMESTAMP NULL,
        CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_level (user_id, level),
        INDEX idx_progress_user (user_id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_unit_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        level ENUM('easy', 'intermediate', 'hard') NOT NULL,
        unit_key VARCHAR(64) NOT NULL,
        unit_title VARCHAR(120) NOT NULL,
        is_unlocked TINYINT(1) NOT NULL DEFAULT 0,
        is_completed TINYINT(1) NOT NULL DEFAULT 0,
        mastery_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        last_activity TIMESTAMP NULL,
        CONSTRAINT fk_uup_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_unit (user_id, level, unit_key),
        INDEX idx_uup_user_level (user_id, level),
        INDEX idx_uup_unlock (user_id, is_unlocked, is_completed)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_review_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NULL,
        quiz_id INT NULL,
        due_at DATETIME NOT NULL,
        correct_streak INT NOT NULL DEFAULT 0,
        last_result ENUM('correct', 'wrong') NOT NULL DEFAULT 'wrong',
        is_mastered TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_review_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(id) ON DELETE SET NULL,
        CONSTRAINT fk_review_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE SET NULL,
        UNIQUE KEY uq_user_quiz_review (user_id, quiz_id),
        INDEX idx_review_due (user_id, due_at, is_mastered),
        INDEX idx_review_result (user_id, last_result)
    )
    """)

    # ── Lesson XP columns on user_level_progress ──────────────────────────
    lesson_progress_columns = [
        ("lesson_xp_earned",  "INT DEFAULT 0"),
        ("lessons_completed", "INT DEFAULT 0"),
    ]
    for col_name, col_def in lesson_progress_columns:
        try:
            cursor.execute(f"ALTER TABLE user_level_progress ADD COLUMN {col_name} {col_def}")
        except pymysql.err.OperationalError as e:
            if e.args[0] == 1060:
                pass
            else:
                raise

    # ── Gamification columns on users ──────────────────────────────────────
    gamification_columns = [
        ("xp",            "INT DEFAULT 0"),
        ("streak",        "INT DEFAULT 0"),
        ("hearts",        "INT DEFAULT 5"),
        ("level",         "INT DEFAULT 1"),
        ("last_activity", "DATE NULL"),
    ]
    for col_name, col_def in gamification_columns:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
        except pymysql.err.OperationalError as e:
            if e.args[0] == 1060:   # Duplicate column – already exists
                pass
            else:
                raise

    # ── Achievements master table ──────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS achievements (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon        VARCHAR(50) DEFAULT '🏅',
        xp_reward   INT DEFAULT 0
    )
    """)

    # ── User achievements (earned) ─────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_achievements (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        user_id        INT NOT NULL,
        achievement_id INT NOT NULL,
        earned_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ua_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_achievement (user_id, achievement_id)
    )
    """)

    # ── Seed achievements ──────────────────────────────────────────────────
    seed_achievements = [
        ("first_lesson",   "Complete your first lesson",        "🌟", 10),
        ("streak_3",       "Maintain a 3-day streak",           "🔥", 15),
        ("streak_7",       "Maintain a 7-day streak",           "🔥", 30),
        ("streak_30",      "Maintain a 30-day streak",          "🔥", 100),
        ("xp_100",         "Earn 100 XP",                       "⚡", 10),
        ("xp_500",         "Earn 500 XP",                       "💎", 25),
        ("perfect_lesson", "Complete a lesson with no mistakes","✨", 20),
        ("level_5",        "Reach Level 5",                     "🏆", 50),
    ]
    for name, desc, icon, reward in seed_achievements:
        cursor.execute("""
            INSERT INTO achievements (name, description, icon, xp_reward)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE description=VALUES(description)
        """, (name, desc, icon, reward))

    _seed_lessons(cursor)
    _seed_quizzes(cursor)
    conn.commit()
    cursor.close()
    conn.close()




