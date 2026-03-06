import React from "react";
import "./LessonCompleteModal.css";

const LessonCompleteModal = ({ result, onContinue }) => {
  if (!result) return null;

  const {
    xp_earned = 0,
    streak_bonus = 0,
    streak = 0,
    level = 1,
    new_achievements = [],
  } = result;

  return (
    <div className="lcm-overlay" onClick={onContinue}>
      <div className="lcm-card" onClick={(e) => e.stopPropagation()}>
        {/* Trophy */}
        <div className="lcm-trophy">🏆</div>
        <h2 className="lcm-title">Lesson Complete!</h2>
        <p className="lcm-subtitle">Great work keeping up your streak!</p>

        {/* Stats row */}
        <div className="lcm-stats">
          <div className="lcm-stat">
            <span className="lcm-stat-icon">⭐</span>
            <span className="lcm-stat-label">XP Earned</span>
            <span className="lcm-stat-value">+{xp_earned}</span>
          </div>

          <div className="lcm-stat">
            <span className="lcm-stat-icon">🔥</span>
            <span className="lcm-stat-label">Streak</span>
            <span className="lcm-stat-value">{streak} days</span>
          </div>

          <div className="lcm-stat">
            <span className="lcm-stat-icon">🎯</span>
            <span className="lcm-stat-label">Level</span>
            <span className="lcm-stat-value">{level}</span>
          </div>
        </div>

        {/* Streak bonus */}
        {streak_bonus > 0 && (
          <div className="lcm-bonus">🎉 Streak Bonus: +{streak_bonus} XP</div>
        )}

        {/* New achievements */}
        {new_achievements.length > 0 && (
          <div className="lcm-achievements">
            <p className="lcm-ach-title">New Achievements Unlocked!</p>
            {new_achievements.map((key) => (
              <div key={key} className="lcm-ach-item">
                🏅 {key.replace(/_/g, " ")}
              </div>
            ))}
          </div>
        )}

        <button className="lcm-btn" onClick={onContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
};

export default LessonCompleteModal;
