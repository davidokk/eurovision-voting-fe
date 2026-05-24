import type { CSSProperties } from "react";
import type { PerformanceWithScores, Theme } from "../../types/contest";
import { PLACE_WORDS } from "./scoresViewShared";

type Props = {
  performance: PerformanceWithScores;
  theme: Theme;
  contestType?: string;
  supportsEmoji: boolean;
  textColor: string;
  subColor: string;
  compact?: boolean;
  /** Узкий экран: без бейджей места, имя с ellipsis */
  narrow?: boolean;
};

export function CountryScoresCell({
  performance: p,
  theme,
  contestType,
  supportsEmoji,
  textColor,
  subColor,
  compact,
  narrow,
}: Props) {
  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const isSemifinal = contestType?.includes("semifinal");
  const hasPlace = p.place !== undefined && p.place !== null && p.place > 0;

  const numberBadge: CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    padding: "2px 7px",
    borderRadius: 6,
    background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.1)",
    color: isLight ? "#475569" : "#cbd5e1",
    flexShrink: 0,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 10, textAlign: "left" }}>
      {supportsEmoji && (
        <span style={{ fontSize: compact ? 18 : 22, lineHeight: 1, flexShrink: 0 }}>
          {p.country.flag_emoji}
        </span>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        {!narrow && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 6,
              marginBottom: compact ? 2 : 4,
            }}
          >
            <span style={numberBadge}>#{p.number}</span>
            {!isSemifinal && hasPlace && p.place != null && (
              <span style={placeBadgeStyle(p.place, isLight, isGray)}>
                {p.place <= 3 ? PLACE_WORDS[p.place] : `${p.place} место`}
              </span>
            )}
            {isSemifinal && (
              <span style={qualifiedBadgeStyle(p.qualified, isLight)}>
                {p.qualified ? "В финале" : "Не прошла"}
              </span>
            )}
          </div>
        )}
        <div
          style={{
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.25,
            fontSize: narrow ? 13 : compact ? 14 : undefined,
            overflow: narrow ? "hidden" : undefined,
            textOverflow: narrow ? "ellipsis" : undefined,
            whiteSpace: narrow ? "nowrap" : undefined,
          }}
        >
          {p.country.name_ru}
        </div>
        {!compact && (
          <div style={{ fontSize: 11, color: subColor, marginTop: 2, lineHeight: 1.3 }}>
            {p.artist} — {p.song}
          </div>
        )}
      </div>
    </div>
  );
}

function placeBadgeStyle(place: number, isLight: boolean, isGray: boolean): CSSProperties {
  const base: CSSProperties = {
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };
  if (place === 1) return { ...base, background: "#facc15", color: "#000" };
  if (place === 2) return { ...base, background: "#94a3b8", color: "#fff" };
  if (place === 3) return { ...base, background: "#d97706", color: "#fff" };
  return {
    ...base,
    background: isLight ? "#1f2937" : isGray ? "#374151" : "#4f7cff",
    color: "#fff",
  };
}

function qualifiedBadgeStyle(qualified: boolean, isLight: boolean): CSSProperties {
  const base: CSSProperties = {
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };
  if (qualified) {
    return {
      ...base,
      background: isLight ? "rgba(34, 197, 94, 0.18)" : "rgba(34, 197, 94, 0.2)",
      color: isLight ? "#166534" : "#4ade80",
      border: "1px solid rgba(34, 197, 94, 0.45)",
    };
  }
  return {
    ...base,
    background: isLight ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.18)",
    color: isLight ? "#991b1b" : "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.4)",
  };
}
