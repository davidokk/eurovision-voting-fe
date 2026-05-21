import { useEffect, useMemo, useRef, useState } from "react";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { PerformanceCard } from "./PerformanceCard";
import { formatTotal, getScoresViewColors, type ScoresViewProps } from "./scores/scoresViewShared";
import { readScoresAuth } from "./scores/scoresViewShared";

export function ScoresRunningOrderView({
  performances,
  theme = "dark-blue",
  contestType,
  votingStarted,
  votingEnded,
  onRated,
}: ScoresViewProps) {
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();
  const colors = getScoresViewColors(theme);
  const { myUserId, myUsername } = readScoresAuth();
  const chipScrollRef = useRef<HTMLDivElement>(null);

  const byNumber = useMemo(
    () => [...performances].sort((a, b) => a.number - b.number),
    [performances]
  );

  const defaultId = useMemo(() => {
    const unvoted = byNumber.find(
      (p) =>
        !p.scores.some(
          (s) => s.user_id === myUserId || (myUsername && s.username === myUsername)
        )
    );
    return unvoted?.performance_id ?? byNumber[0]?.performance_id ?? null;
  }, [byNumber, myUserId, myUsername]);

  const [selectedId, setSelectedId] = useState<string | null>(defaultId);

  useEffect(() => {
    if (!selectedId && defaultId) setSelectedId(defaultId);
  }, [defaultId, selectedId]);

  useEffect(() => {
    if (selectedId && !byNumber.some((p) => p.performance_id === selectedId)) {
      setSelectedId(defaultId);
    }
  }, [byNumber, selectedId, defaultId]);

  const selected = byNumber.find((p) => p.performance_id === selectedId) ?? byNumber[0];

  useEffect(() => {
    if (!chipScrollRef.current || !selectedId) return;
    const el = chipScrollRef.current.querySelector(`[data-id="${selectedId}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedId]);

  if (performances.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: colors.empty }}>
        Нет выступлений
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div
        ref={chipScrollRef}
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "4px 4px 16px",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
        }}
      >
        {byNumber.map((p) => {
          const active = p.performance_id === selected?.performance_id;
          const hasVotes = p.scores.length > 0;
          const iVoted = p.scores.some(
            (s) => s.user_id === myUserId || (myUsername && s.username === myUsername)
          );

          return (
            <button
              key={p.performance_id}
              type="button"
              data-id={p.performance_id}
              onClick={() => setSelectedId(p.performance_id)}
              style={{
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minWidth: 72,
                padding: "10px 12px",
                borderRadius: 14,
                border: active ? colors.chipActiveBorder : colors.chipBorder,
                background: active ? colors.chipActive : colors.chipBg,
                cursor: "pointer",
                boxShadow: active
                  ? "0 4px 16px rgba(79,124,255,0.25)"
                  : "none",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: active ? colors.accent : colors.sub,
                }}
              >
                #{p.number}
              </span>
              {supportsEmoji && (
                <span style={{ fontSize: 22, lineHeight: 1 }}>{p.country.flag_emoji}</span>
              )}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.text,
                  maxWidth: 64,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={p.country.name_ru}
              >
                {p.country.name_ru}
              </span>
              {hasVotes && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: colors.accent,
                  }}
                >
                  {formatTotal(p.total_score)}
                </span>
              )}
              {iVoted && (
                <span style={{ fontSize: 10, color: colors.gold }}>⭐</span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{ marginTop: 8 }}>
          <PerformanceCard
            performance={selected}
            votingStarted={votingStarted}
            votingEnded={votingEnded}
            theme={theme}
            contestType={contestType}
            onRated={onRated}
          />
        </div>
      )}
    </div>
  );
}
