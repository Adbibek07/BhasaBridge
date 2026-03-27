from flask import Blueprint, jsonify, request, session
import pymysql
from db import connect_db
from gamification import (
    award_xp, deduct_heart, restore_hearts,
    unlock_achievement, get_level_for_xp,
    LEVEL_THRESHOLDS, MAX_HEARTS,
)
from routes.login_required import login_required

gamification = Blueprint("gamification", __name__)


def _db():
    conn = connect_db()
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    cursor.execute("USE Bhasabridge")
    return conn, cursor


# ── GET /api/user/stats ───────────────────────────────────────────────────────
@gamification.route("/user/stats", methods=["GET"])
@login_required
def user_stats():
    user_id = session.get("user_id")
    conn, cursor = _db()
    try:
        cursor.execute(
            "SELECT xp, streak, hearts, level, last_activity FROM users WHERE id=%s",
            (user_id,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404

        xp       = row["xp"] or 0
        level    = row["level"] or 1
        streak   = row["streak"] or 0
        hearts   = row["hearts"] if row["hearts"] is not None else MAX_HEARTS

        prev_xp  = LEVEL_THRESHOLDS[level - 1] if level >= 1 else 0
        next_xp  = LEVEL_THRESHOLDS[level] if level < len(LEVEL_THRESHOLDS) else xp

        return jsonify({
            "xp":            xp,
            "level":         level,
            "streak":        streak,
            "hearts":        hearts,
            "max_hearts":    MAX_HEARTS,
            "prev_level_xp": prev_xp,
            "next_level_xp": next_xp,
            "last_activity": str(row["last_activity"]) if row["last_activity"] else None,
        })
    finally:
        cursor.close()
        conn.close()


# ── POST /api/lesson/complete ─────────────────────────────────────────────────
@gamification.route("/lesson/complete", methods=["POST"])
@login_required
def complete_lesson():
    user_id  = session.get("user_id")
    data     = request.json or {}
    mistakes = int(data.get("mistakes", 0))
    level    = data.get("level", "easy")

    xp_type = "perfect_lesson" if mistakes == 0 else "lesson_complete"
    result  = award_xp(user_id, xp_type)

    # Restore hearts after finishing a lesson
    restore_hearts(user_id)
    result["hearts"] = MAX_HEARTS

    # Track per-level lesson XP in user_level_progress
    xp_earned = result.get("xp_earned", 0)
    conn, cursor = _db()
    try:
        cursor.execute(
            "SELECT id FROM user_level_progress WHERE user_id=%s AND level=%s",
            (user_id, level),
        )
        if cursor.fetchone():
            cursor.execute(
                """
                UPDATE user_level_progress
                SET lesson_xp_earned  = lesson_xp_earned + %s,
                    lessons_completed = lessons_completed + 1,
                    last_played_at    = CURRENT_TIMESTAMP
                WHERE user_id=%s AND level=%s
                """,
                (xp_earned, user_id, level),
            )
        else:
            cursor.execute(
                """
                INSERT INTO user_level_progress
                    (user_id, level, lesson_xp_earned, lessons_completed, last_played_at)
                VALUES (%s, %s, %s, 1, CURRENT_TIMESTAMP)
                """,
                (user_id, level, xp_earned),
            )
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    # Unlock first-lesson achievement
    unlock_achievement(user_id, "first_lesson")
    if mistakes == 0:
        unlock_achievement(user_id, "perfect_lesson")

    return jsonify(result)


# ── GET /api/lesson/level-stats ───────────────────────────────────────────────
@gamification.route("/lesson/level-stats", methods=["GET"])
@login_required
def lesson_level_stats():
    """Return per-level lesson XP and completion count for the logged-in user."""
    user_id = session.get("user_id")
    conn, cursor = _db()
    try:
        cursor.execute(
            """
            SELECT level,
                   COALESCE(lesson_xp_earned,  0) AS lesson_xp_earned,
                   COALESCE(lessons_completed, 0) AS lessons_completed
            FROM user_level_progress
            WHERE user_id = %s
            """,
            (user_id,),
        )
        rows = cursor.fetchall()
        result = {r["level"]: r for r in rows}
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()


# ── POST /api/lesson/wrong_answer ─────────────────────────────────────────────
@gamification.route("/lesson/wrong_answer", methods=["POST"])
@login_required
def wrong_answer():
    user_id = session.get("user_id")
    hearts  = deduct_heart(user_id)
    return jsonify({"hearts": hearts, "max_hearts": MAX_HEARTS})


# ── GET /api/leaderboard ──────────────────────────────────────────────────────
@gamification.route("/leaderboard", methods=["GET"])
@login_required
def leaderboard():
    conn, cursor = _db()
    try:
        cursor.execute("""
            SELECT name, xp, streak, level
            FROM users
            ORDER BY xp DESC
            LIMIT 10
        """)
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


# ── GET /api/user/achievements ────────────────────────────────────────────────
@gamification.route("/user/achievements", methods=["GET"])
@login_required
def get_achievements():
    user_id = session.get("user_id")
    conn, cursor = _db()
    try:
        cursor.execute("""
            SELECT a.name, a.description, a.icon, a.xp_reward, ua.earned_at
            FROM achievements a
            JOIN user_achievements ua ON a.id = ua.achievement_id
            WHERE ua.user_id = %s
            ORDER BY ua.earned_at DESC
        """, (user_id,))
        rows = cursor.fetchall()
        # Convert datetime to string for JSON
        for r in rows:
            if r.get("earned_at"):
                r["earned_at"] = str(r["earned_at"])
        return jsonify(rows)
    finally:
        cursor.close()
        conn.close()
