"""
Gamification engine – XP, streaks, hearts, levels, achievements.
"""
from datetime import date
import pymysql
from db import connect_db

# ── XP awarded per action ─────────────────────────────────────────────────────
XP_REWARDS = {
    "lesson_complete":  10,
    "perfect_lesson":   20,
    "streak_bonus":      5,   # multiplied by streak milestones
    "quiz_complete":    15,
}

MAX_HEARTS = 5

# XP needed to REACH each level (index = level number)
# Level 1 starts at 0 XP
LEVEL_THRESHOLDS = [0, 0, 50, 150, 300, 500, 750, 1100, 1500, 2000, 2600]


def get_level_for_xp(xp: int) -> int:
    """Return the level (1-based) for the given total XP."""
    current = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if xp >= threshold:
            current = i if i > 0 else 1
    return current


def _use_db(conn):
    """Ensures the correct database is selected on the connection."""
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    cursor.execute("USE Bhasabridge")
    return cursor


# ── Core: award XP & update streak ───────────────────────────────────────────
def award_xp(user_id: int, xp_type: str, conn=None) -> dict:
    """
    Award XP to user_id for xp_type action.
    Updates streak and level automatically.
    Returns a summary dict with earned xp, total xp, streak, level info.
    """
    should_close = conn is None
    if conn is None:
        conn = connect_db()
    cursor = _use_db(conn)

    base_xp = XP_REWARDS.get(xp_type, 0)

    cursor.execute(
        "SELECT xp, streak, last_activity, hearts, level FROM users WHERE id=%s",
        (user_id,)
    )
    user = cursor.fetchone()
    if not user:
        return {}

    today = date.today()
    last_act = user["last_activity"]
    new_streak = user["streak"] or 0
    streak_bonus = 0

    # Streak logic
    if last_act:
        diff = (today - (last_act if isinstance(last_act, date) else last_act.date())).days
        if diff == 1:
            new_streak += 1
            # Bonus on weekly milestones
            streak_bonus = XP_REWARDS["streak_bonus"] * (new_streak // 7 + 1)
        elif diff > 1:
            new_streak = 1
        # diff == 0 → same day, streak unchanged, no bonus
    else:
        new_streak = 1

    total_xp = (user["xp"] or 0) + base_xp + streak_bonus
    new_level = get_level_for_xp(total_xp)

    cursor.execute(
        """
        UPDATE users
        SET xp=%s, streak=%s, last_activity=%s, level=%s
        WHERE id=%s
        """,
        (total_xp, new_streak, today, new_level, user_id),
    )

    earned_achievements = _check_achievements(user_id, total_xp, new_streak, cursor)

    conn.commit()
    if should_close:
        cursor.close()
        conn.close()

    prev_level_xp  = LEVEL_THRESHOLDS[new_level - 1] if new_level >= 1 else 0
    next_level_xp  = LEVEL_THRESHOLDS[new_level] if new_level < len(LEVEL_THRESHOLDS) else total_xp

    return {
        "xp_earned":      base_xp + streak_bonus,
        "streak_bonus":   streak_bonus,
        "total_xp":       total_xp,
        "streak":         new_streak,
        "level":          new_level,
        "prev_level_xp":  prev_level_xp,
        "next_level_xp":  next_level_xp,
        "new_achievements": earned_achievements,
    }


# ── Hearts ────────────────────────────────────────────────────────────────────
def deduct_heart(user_id: int, conn=None) -> int:
    """Remove one heart. Returns remaining hearts (min 0)."""
    should_close = conn is None
    if conn is None:
        conn = connect_db()
    cursor = _use_db(conn)

    cursor.execute("SELECT hearts FROM users WHERE id=%s", (user_id,))
    row = cursor.fetchone()
    hearts = max(0, (row["hearts"] or MAX_HEARTS) - 1) if row else 0

    cursor.execute("UPDATE users SET hearts=%s WHERE id=%s", (hearts, user_id))
    conn.commit()
    if should_close:
        cursor.close()
        conn.close()
    return hearts


def restore_hearts(user_id: int, conn=None) -> int:
    """Restore hearts to max (called after lesson is finished)."""
    should_close = conn is None
    if conn is None:
        conn = connect_db()
    cursor = _use_db(conn)
    cursor.execute("UPDATE users SET hearts=%s WHERE id=%s", (MAX_HEARTS, user_id))
    conn.commit()
    if should_close:
        cursor.close()
        conn.close()
    return MAX_HEARTS


# ── Achievement checker ───────────────────────────────────────────────────────
def _check_achievements(user_id: int, xp: int, streak: int, cursor) -> list:
    """Check and unlock achievements. Returns list of newly earned names."""
    to_unlock = []

    if xp >= 100:   to_unlock.append("xp_100")
    if xp >= 500:   to_unlock.append("xp_500")
    if streak >= 3: to_unlock.append("streak_3")
    if streak >= 7: to_unlock.append("streak_7")
    if streak >= 30: to_unlock.append("streak_30")
    if get_level_for_xp(xp) >= 5: to_unlock.append("level_5")

    newly_earned = []
    for key in to_unlock:
        cursor.execute("SELECT id FROM achievements WHERE name=%s", (key,))
        ach = cursor.fetchone()
        if not ach:
            continue
        try:
            cursor.execute(
                "INSERT INTO user_achievements (user_id, achievement_id) VALUES (%s, %s)",
                (user_id, ach["id"]),
            )
            newly_earned.append(key)
        except pymysql.err.IntegrityError:
            pass  # already earned

    return newly_earned


def unlock_achievement(user_id: int, achievement_name: str, conn=None):
    """Manually unlock a named achievement for a user."""
    should_close = conn is None
    if conn is None:
        conn = connect_db()
    cursor = _use_db(conn)
    cursor.execute("SELECT id FROM achievements WHERE name=%s", (achievement_name,))
    ach = cursor.fetchone()
    if ach:
        try:
            cursor.execute(
                "INSERT INTO user_achievements (user_id, achievement_id) VALUES (%s,%s)",
                (user_id, ach["id"]),
            )
            conn.commit()
        except pymysql.err.IntegrityError:
            pass
    if should_close:
        cursor.close()
        conn.close()
