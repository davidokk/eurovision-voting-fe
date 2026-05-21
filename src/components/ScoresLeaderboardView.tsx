import { useMemo, useState } from "react";
import type { PerformanceWithScores } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { CountryScoresCell } from "./scores/CountryScoresCell";
import { MyScoreAction } from "./scores/MyScoreAction";
import { ScoresRateModal } from "./scores/ScoresRateModal";
import { useNarrowScreen } from "./scores/useNarrowScreen";
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
  const isNarrow = useNarrowScreen();
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

  const rowPad = isNarrow ? "10px 12px" : "12px 16px";
  const indent = isNarrow ? 36 : 46;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        boxSizing: "border-box",
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
          padding: isNarrow ? "10px 12px" : "12px 16px",
          borderBottom: `1px solid ${colors.border}`,
          flexWrap: "wrap",
        }}
      >
        <SortChip
          active={sortMode === "score"}
          label="По баллу"
          onClick={() => setSortMode("score")}
          colors={colors}
          compact={isNarrow}
        />
        <SortChip
          active={sortMode === "number"}
          label="По порядку"
          onClick={() => setSortMode("number")}
          colors={colors}
          compact={isNarrow}
        />
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {sorted.map((p, index) => {
          const mine = myScoreFor(p);
          const expanded = expandedId === p.performance_id;
          const barPct = Math.min(100, (p.total_score / maxScore) * 100);
          const rank = sortMode === "score" ? index + 1 : null;
          const rowBg = index % 2 === 0 ? colors.cellBg : colors.cellAlt;
          const totalColor = getScoreColor(Math.max(1, Math.min(10, p.total_score)));

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
                  padding: rowPad,
                  cursor: "pointer",
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
                onClick={() =>
                  setExpandedId(expanded ? null : p.performance_id)
                }
              >
                {isNarrow ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          flexShrink: 0,
                          fontWeight: 900,
                          fontSize: 15,
                          lineHeight: 1.3,
                          color: rank && rank <= 3 ? getScoreColor(10 - rank + 1) : colors.sub,
                          textAlign: "center",
                        }}
                      >
                        {rank ?? `#${p.number}`}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <CountryScoresCell
                          performance={p}
                          theme={theme}
                          contestType={contestType}
                          supportsEmoji={supportsEmoji}
                          textColor={colors.text}
                          subColor={colors.sub}
                          compact
                          narrow
                        />
                      </div>
                      <div
                        style={{
                          flexShrink: 0,
                          fontWeight: 900,
                          fontSize: 15,
                          lineHeight: 1.3,
                          color: totalColor,
                          textAlign: "right",
                          minWidth: 40,
                        }}
                      >
                        {formatTotal(p.total_score)}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        marginLeft: indent,
                        height: 5,
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
                          background: totalColor,
                        }}
                      />
                    </div>

                    {showMyColumn && (
                      <div
                        style={{
                          marginTop: 8,
                          marginLeft: indent,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          minWidth: 0,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: colors.sub,
                            flexShrink: 0,
                          }}
                        >
                          Моя оценка
                        </span>
                        <MyScoreAction
                          mine={mine}
                          canVote={canVote}
                          onRate={() => canVote && setRateTarget(p)}
                          colors={colors}
                          compact
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: showMyColumn
                        ? "36px 1fr 72px 88px"
                        : "36px 1fr 72px",
                      gap: 10,
                      alignItems: "center",
                    }}
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
                            background: totalColor,
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
                        color: totalColor,
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
                )}
              </div>

              {expanded && (
                <div
                  style={{
                    padding: isNarrow ? "0 12px 12px" : `0 16px 14px ${indent}px`,
                    fontSize: 13,
                    color: colors.sub,
                    boxSizing: "border-box",
                    wordBreak: "break-word",
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
  compact,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  colors: ReturnType<typeof getScoresViewColors>;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? colors.chipActiveBorder : colors.chipBorder,
        borderRadius: 8,
        padding: compact ? "5px 10px" : "6px 12px",
        fontSize: compact ? 11 : 12,
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
