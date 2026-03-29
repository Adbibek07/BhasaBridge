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
    completion_mode = "checkpoint",
    completed_unit_title = "Unit",
    next_unit = null,
    review_items_added = 0,
    weak_topic = null,
    already_completed = false,
  } = result;

  const nextUnitLabel = next_unit
    ? `${next_unit.unit_title} (${next_unit.level})`
    : "No further unit in this level.";

  const weakTopicLabel = weak_topic
    ? `${weak_topic.unit_title || "Core"} (${weak_topic.weak_count || 0})`
    : "No weak topic detected.";

  return (
    <div className="lcm-overlay" onClick={onContinue}>
      <div className="lcm-card" onClick={(e) => e.stopPropagation()}>
        <div className="lcm-trophy" aria-hidden="true">
          T
        </div>
        <h2 className="lcm-title">
          {already_completed ? "Unit Review Complete" : "Lesson Complete!"}
        </h2>
        <p className="lcm-subtitle">
          {already_completed
            ? "This unit was already completed, so this pass refreshed your mastery without new completion XP."
            : completion_mode === "recall_only"
              ? "Checkpoint skipped, so this unit finished through recall-only completion."
              : "Great work keeping your learning rhythm going."}
        </p>

        <div className="lcm-stats">
          <div className="lcm-stat">
            <span className="lcm-stat-icon">XP</span>
            <span className="lcm-stat-label">XP Earned</span>
            <span className="lcm-stat-value">+{xp_earned}</span>
          </div>

          <div className="lcm-stat">
            <span className="lcm-stat-icon">ST</span>
            <span className="lcm-stat-label">Streak</span>
            <span className="lcm-stat-value">{streak} days</span>
          </div>

          <div className="lcm-stat">
            <span className="lcm-stat-icon">LV</span>
            <span className="lcm-stat-label">Level</span>
            <span className="lcm-stat-value">{level}</span>
          </div>
        </div>

        {streak_bonus > 0 && (
          <div className="lcm-bonus">Streak bonus: +{streak_bonus} XP</div>
        )}

        {already_completed && (
          <div className="lcm-review-note">
            Replaying completed units is still useful for memory. The payoff
            here is stronger recall, not repeated completion credit.
          </div>
        )}

        {new_achievements.length > 0 && (
          <div className="lcm-achievements">
            <p className="lcm-ach-title">New Achievements Unlocked</p>
            {new_achievements.map((key) => (
              <div key={key} className="lcm-ach-item">
                {key.replace(/_/g, " ")}
              </div>
            ))}
          </div>
        )}

        <div className="lcm-summary-grid">
          <div className="lcm-summary-card">
            <span>{already_completed ? "Reviewed Unit" : "Unit Completed"}</span>
            <strong>{completed_unit_title}</strong>
          </div>
          <div className="lcm-summary-card">
            <span>{already_completed ? "Next Suggested Unit" : "Next Unit Unlocked"}</span>
            <strong>{nextUnitLabel}</strong>
          </div>
          <div className="lcm-summary-card">
            <span>Items Added To Review</span>
            <strong>
              {review_items_added} item{review_items_added === 1 ? "" : "s"}
            </strong>
          </div>
          <div className="lcm-summary-card">
            <span>Weak Topic Detected</span>
            <strong>{weakTopicLabel}</strong>
          </div>
        </div>

        <button className="lcm-btn" onClick={onContinue}>
          Back to Units
        </button>
      </div>
    </div>
  );
};

export default LessonCompleteModal;
