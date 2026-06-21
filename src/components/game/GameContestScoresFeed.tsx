import type { Theme } from "../../types/contest";
import type { GameContestScore } from "../../types/game";
import { ScoreTwelveDisplay } from "../ScoreTwelveDisplay";
import { getScoreColor, isScoreTwelve } from "../../utils/scoreUtils";

type Props = {
  scores: GameContestScore[];
  theme: Theme;
  compact?: boolean;
  embedded?: boolean;
  showSummary?: boolean;
  totalScore?: number;
  contestType?: string;
  qualified?: boolean;
  place?: number;
};

const PLACE_WORDS: Record<number, string> = {
  1: "Первое место",
  2: "Второе место",
  3: "Третье место",
};

function formatAvg(num: number) {
  return Number(num.toFixed(2));
}

export function formatRevealAvg(num: number) {
  return formatAvg(num);
}

export function computeRevealAvg(scores: GameContestScore[], totalScore?: number) {
  if (totalScore != null && Number.isFinite(totalScore) && (totalScore > 0 || scores.length === 0)) {
    return totalScore;
  }
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  return sum / scores.length;
}

export function GameRevealOutcomeBadge({
  contestType,
  qualified,
  place,
  theme,
}: {
  contestType?: string;
  qualified?: boolean;
  place?: number;
  theme: Theme;
}) {
  return (
    <ContestOutcomeBadge
      contestType={contestType}
      qualified={qualified}
      place={place}
      theme={theme}
      className="gts-reveal-card__outcome"
    />
  );
}

function ContestOutcomeBadge({
  contestType,
  qualified,
  place,
  theme,
  className,
}: {
  contestType?: string;
  qualified?: boolean;
  place?: number;
  theme: Theme;
  className?: string;
}) {
  const isLight = theme === "light";
  const isSemifinal = contestType?.includes("semifinal");
  const hasPlace = place != null && place > 0;
  const baseClass = ["gts-contest-scores__badge", className].filter(Boolean).join(" ");

  if (isSemifinal && qualified != null) {
    return (
      <span
        className={`${baseClass} ${
          qualified ? "gts-contest-scores__badge--qualified" : "gts-contest-scores__badge--eliminated"
        }`}
        data-theme={isLight ? "light" : "dark"}
      >
        {qualified ? "В финале" : "Не прошла"}
      </span>
    );
  }

  if (!isSemifinal && hasPlace) {
    const placeClass =
      place === 1
        ? "gts-contest-scores__badge--place-1"
        : place === 2
          ? "gts-contest-scores__badge--place-2"
          : place === 3
            ? "gts-contest-scores__badge--place-3"
            : "gts-contest-scores__badge--place-n";
    const label = place! <= 3 ? PLACE_WORDS[place!] : `${place} место`;
    return <span className={`${baseClass} ${placeClass}`}>{label}</span>;
  }

  return null;
}

function ContestScoreSummary({
  avg,
  contestType,
  qualified,
  place,
  theme,
  compact,
}: {
  avg: number;
  contestType?: string;
  qualified?: boolean;
  place?: number;
  theme: Theme;
  compact?: boolean;
}) {
  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const avgColor = getScoreColor(avg);
  const gradEnd = isLight ? "#f1f5f9" : isGray ? "#121212" : "#0f172a";
  const outcome = (
    <ContestOutcomeBadge contestType={contestType} qualified={qualified} place={place} theme={theme} />
  );

  if (compact) {
    return (
      <div className="gts-contest-scores__summary">
        <div
          className="gts-contest-scores__avg"
          style={{ background: `linear-gradient(135deg, ${avgColor} 0%, ${gradEnd} 150%)` }}
        >
          <span className="gts-contest-scores__avg-label">Балл</span>
          <span className="gts-contest-scores__avg-value">{formatRevealAvg(avg)}</span>
        </div>
        {outcome}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 72,
          padding: "10px 12px",
          borderRadius: 12,
          background: `linear-gradient(135deg, ${avgColor} 0%, ${gradEnd} 150%)`,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", opacity: 0.75 }}>Балл</div>
        <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>{formatRevealAvg(avg)}</div>
      </div>
      {outcome}
    </div>
  );
}

export function GameContestScoresFeed({
  scores,
  theme,
  compact = false,
  embedded = false,
  showSummary = true,
  totalScore,
  contestType,
  qualified,
  place,
}: Props) {
  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const text = isLight ? "#0f172a" : "#e2e8f0";
  const sub = isLight ? "#64748b" : "#94a3b8";
  const border = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #2a2a2a" : "1px solid rgba(255,255,255,0.08)";
  const itemBg = isLight ? "rgba(248,250,252,0.9)" : isGray ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.5)";
  const scoreColor = isLight ? "#d97706" : "#ffd166";

  const avg = computeRevealAvg(scores, totalScore);
  const showSummaryBlock = showSummary && (avg != null || qualified != null || (place != null && place > 0));

  if (scores.length === 0 && !showSummaryBlock) {
    return (
      <p className="gts-contest-scores__empty" style={{ color: sub }}>
        Нет оценок с конкурса
      </p>
    );
  }

  const summary =
    showSummary && avg != null ? (
      <ContestScoreSummary
        avg={avg}
        contestType={contestType}
        qualified={qualified}
        place={place}
        theme={theme}
        compact={compact}
      />
    ) : showSummary && showSummaryBlock ? (
      <div className={compact ? "gts-contest-scores__summary gts-contest-scores__summary--outcome-only" : undefined}>
        <ContestOutcomeBadge contestType={contestType} qualified={qualified} place={place} theme={theme} />
      </div>
    ) : null;

  if (compact) {
    return (
      <div className={`gts-contest-scores gts-contest-scores--compact${embedded ? " gts-contest-scores--embedded" : ""}`}>
        {summary}
        {scores.length > 0 && (
          <>
            <div className="gts-contest-scores__title">
              Оценки зрителей · {scores.length}
            </div>
            <div className="gts-contest-scores__list">
              {scores.map((s) => (
                <div
                  key={`${s.username}-${s.score}`}
                  className="gts-contest-scores__item"
                  style={embedded ? undefined : { border, background: itemBg }}
                >
                  <div className="gts-contest-scores__row">
                    <span
                      className="gts-contest-scores__name"
                      style={embedded ? undefined : { color: text }}
                    >
                      {s.username}
                    </span>
                    {isScoreTwelve(s.score) ? (
                      <ScoreTwelveDisplay score={s.score} variant="badge" />
                    ) : (
                      <span
                        className="gts-contest-scores__pts"
                        style={embedded ? undefined : { color: scoreColor }}
                      >
                        {s.score}
                      </span>
                    )}
                  </div>
                  {s.comment?.trim() && (
                    <p
                      className="gts-contest-scores__comment"
                      style={embedded ? undefined : { color: sub }}
                    >
                      «{s.comment.trim()}»
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
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
      {summary}
      {scores.length > 0 && (
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
      )}
    </div>
  );
}
