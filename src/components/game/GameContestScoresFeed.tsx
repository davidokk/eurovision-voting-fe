import type { Theme } from "../../types/contest";
import type { GameContestScore } from "../../types/game";
import { ScoreTwelveDisplay } from "../ScoreTwelveDisplay";
import { isScoreTwelve } from "../../utils/scoreUtils";

type Props = {
  scores: GameContestScore[];
  theme: Theme;
  compact?: boolean;
};

export function GameContestScoresFeed({ scores, theme, compact = false }: Props) {
  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const text = isLight ? "#0f172a" : "#e2e8f0";
  const sub = isLight ? "#64748b" : "#94a3b8";
  const border = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #2a2a2a" : "1px solid rgba(255,255,255,0.08)";
  const itemBg = isLight ? "rgba(248,250,252,0.9)" : isGray ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.5)";
  const scoreColor = isLight ? "#d97706" : "#ffd166";

  if (scores.length === 0) {
    return (
      <p className="gts-contest-scores__empty" style={{ color: sub }}>
        Нет оценок с конкурса
      </p>
    );
  }

  if (compact) {
    return (
      <div className="gts-contest-scores gts-contest-scores--compact">
        <div className="gts-contest-scores__title" style={{ color: sub }}>
          Оценки зрителей · {scores.length}
        </div>
        <div className="gts-contest-scores__list">
          {scores.map((s) => (
            <div
              key={`${s.username}-${s.score}`}
              className="gts-contest-scores__item"
              style={{ border, background: itemBg }}
            >
              <div className="gts-contest-scores__row">
                <span className="gts-contest-scores__name" style={{ color: text }}>
                  {s.username}
                </span>
                {isScoreTwelve(s.score) ? (
                  <ScoreTwelveDisplay score={s.score} variant="badge" />
                ) : (
                  <span className="gts-contest-scores__pts" style={{ color: scoreColor }}>
                    {s.score}
                  </span>
                )}
              </div>
              {s.comment?.trim() && (
                <p className="gts-contest-scores__comment" style={{ color: sub }}>
                  «{s.comment.trim()}»
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h4
        style={{
          margin: "0 0 10px",
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: sub,
        }}
      >
        Оценки с конкурса
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
        {scores.map((s) => (
          <div
            key={`${s.username}-${s.score}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              border,
              background: itemBg,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: text, fontSize: 14 }}>{s.username}</div>
              {s.comment?.trim() && (
                <div style={{ fontSize: 12, color: sub, marginTop: 4, fontStyle: "italic" }}>
                  «{s.comment.trim()}»
                </div>
              )}
            </div>
            {isScoreTwelve(s.score) ? (
              <ScoreTwelveDisplay score={s.score} variant="badge" />
            ) : (
              <span style={{ fontWeight: 900, fontSize: 18, color: scoreColor, flexShrink: 0 }}>{s.score}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
