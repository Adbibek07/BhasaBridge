import React, { useEffect, useState, useCallback } from "react";
import "./StatsBar.css";

const MAX_HEARTS = 5;

const StatsBar = ({ refreshTrigger = 0 }) => {
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/user/stats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Re-fetch every 30 seconds to pick up gamification changes
    const timer = setInterval(fetchStats, 30000);
    return () => clearInterval(timer);
  }, [fetchStats, refreshTrigger]);

  if (!stats) return null;

  const { xp, level, streak, hearts, prev_level_xp, next_level_xp } = stats;
  const progress =
    next_level_xp > prev_level_xp
      ? Math.round(
          ((xp - prev_level_xp) / (next_level_xp - prev_level_xp)) * 100,
        )
      : 100;

  return (
    <div className="stats-bar">
      {/* Streak */}
      <div className="sb-item sb-streak" title={`${streak}-day streak`}>
        <span className="sb-icon">🔥</span>
        <span className="sb-value">{streak}</span>
      </div>

      {/* Hearts */}
      <div
        className="sb-item sb-hearts"
        title={`${hearts}/${MAX_HEARTS} hearts`}
      >
        {Array.from({ length: MAX_HEARTS }).map((_, i) => (
          <span key={i} className={`sb-heart ${i < hearts ? "full" : "empty"}`}>
            {i < hearts ? "❤️" : "🖤"}
          </span>
        ))}
      </div>

      {/* XP / Level */}
      <div className="sb-item sb-xp">
        <span className="sb-level-badge">Lv.{level}</span>
        <div className="sb-xp-bar" title={`${xp} / ${next_level_xp} XP`}>
          <div
            className="sb-xp-fill"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="sb-xp-text">{xp} XP</span>
      </div>
    </div>
  );
};

export default StatsBar;
