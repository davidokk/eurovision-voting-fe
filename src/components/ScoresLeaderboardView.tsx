import { useMemo, useState } from "react";
import type { PerformanceWithScores } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { CountryScoresCell } from "./scores/CountryScoresCell";
import { MyScoreAction } from "./scores/MyScoreAction";
import { ScoresRateModal } from "./scores/ScoresRateModal";
import {
  formatTotal,
  getScoreColor,
  getScoresViewColors,
  type ScoresViewProps,
} from "./scores/scoresViewShared";
import { useScoresViewAuth } from "./scores/useScoresViewAuth";

type SortMode = "score" | "number";

export function ScoresLeaderboardView({
  performances,
  theme = "dark-blue",
  contestType,
  votingStarted,
  votingEnded,
  isAuthenticated,
  onRated,
}: ScoresViewProps) {
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();
  const colors = getScoresViewColors(theme);
  const { canVote, showMyColumn, myScoreFor } = useScoresViewAuth({
    isAuthenticated,
    votingStarted,
    votingEnded,
  });

  const [sortMode, setSortMode] = useState<SortMode>("score");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rateTarget, setRateTarget] = useState<PerformanceWithScores | null>(null);

  const sorted = useMemo(() => {
    const copy = [...performances];
    if (sortMode === "number") {
      copy.sort((a, b) => a.number - b.number);
    } else {
      copy.sort((a, b) => b.total_score - a.total_score || a.number - b.number);
    }
    return copy;
  }, [performances, sortMode]);

  const maxScore = useMemo(
    () => Math.max(1, ...performances.map((p) => p.total_score)),
    [performances]
  );

  if (performances.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: colors.empty }}>
        Нет выступлений
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        borderRadius: 16,
        border: colors.wrapBorder,
        background: colors.wrapBg,
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        boxShadow: colors.shadow,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          borderBottom: `1px solid ${colors.border}`,
          flexWrap: "wrap",
        }}
      >
        <SortChip
          active={sortMode === "score"}
          label="По баллу"
          onClick={() => setSortMode("score")}
          colors={colors}
        />
        <SortChip
          active={sortMode === "number"}
          label="По порядку"
          onClick={() => setSortMode("number")}
          colors={colors}
        />
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {sorted.map((p, index) => {
          const mine = myScoreFor(p);
          const expanded = expandedId === p.performance_id;
          const barPct = Math.min(100, (p.total_score / maxScore) * 100);
          const rank = sortMode === "score" ? index + 1 : null;
          const rowBg = index % 2 === 0 ? colors.cellBg : colors.cellAlt;

          return (
            <li
              key={p.performance_id}
              style={{
                borderBottom: `1px solid ${colors.border}`,
                background: rowBg,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: showMyColumn
                    ? "36px 1fr 72px 88px"
                    : "36px 1fr 72px",
                  gap: 10,
                  alignItems: "center",
                  padding: "12px 16px",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setExpandedId(expanded ? null : p.performance_id)
                }
              >
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 18,
                    color: rank && rank <= 3 ? getScoreColor(10 - rank + 1) : colors.sub,
                    textAlign: "center",
                  }}
                >
                  {rank ?? `#${p.number}`}
                </div>

                <div style={{ minWidth: 0 }}>
                  <CountryScoresCell
                    performance={p}
                    theme={theme}
                    contestType={contestType}
                    supportsEmoji={supportsEmoji}
                    textColor={colors.text}
                    subColor={colors.sub}
                    compact
                  />
                  <div
                    style={{
                      marginTop: 8,
                      height: 6,
                      borderRadius: 4,
                      background: colors.isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${barPct}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: getScoreColor(Math.max(1, Math.min(10, p.total_score))),
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 900,
                    fontSize: 18,
                    color: getScoreColor(Math.max(1, Math.min(10, p.total_score))),
                  }}
                >
                  {formatTotal(p.total_score)}
                </div>

                {showMyColumn && (
                  <div
                    style={{ textAlign: "center" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MyScoreAction
                      mine={mine}
                      canVote={canVote}
                      onRate={() => canVote && setRateTarget(p)}
                      colors={colors}
                    />
                  </div>
                )}
              </div>

              {expanded && (
                <div
                  style={{
                    padding: "0 16px 14px 62px",
                    fontSize: 13,
                    color: colors.sub,
                  }}
                >
                  <div style={{ marginBottom: 6, color: colors.text, fontWeight: 600 }}>
                    {p.artist} — {p.song}
                  </div>
                  {p.scores.length === 0 ? (
                    <span>Пока нет оценок</span>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {p.scores.slice(0, 8).map((s, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "baseline",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 800, color: getScoreColor(s.score) }}>
                            {s.score}
                          </span>
                          <span style={{ color: colors.text }}>{s.username}</span>
                          {s.comment && (
                            <span style={{ fontStyle: "italic" }}>«{s.comment}»</span>
                          )}
                        </div>
                      ))}
                      {p.scores.length > 8 && (
                        <span>+{p.scores.length - 8} ещё</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ScoresRateModal
        rateTarget={rateTarget}
        theme={theme}
        myScoreFor={myScoreFor}
        onClose={() => setRateTarget(null)}
        onRated={onRated}
      />
    </div>
  );
}

function SortChip({
  active,
  label,
  onClick,
  colors,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  colors: ReturnType<typeof getScoresViewColors>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? colors.chipActiveBorder : colors.chipBorder,
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        background: active ? colors.chipActive : colors.chipBg,
        color: active ? colors.accent : colors.sub,
      }}
    >
      {label}
    </button>
  );
}
