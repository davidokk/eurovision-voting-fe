import { useMemo, type ReactNode } from "react";
import type { CSSProperties } from "react";
import type { ContestView, PerformanceWithScores, Theme } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { formatTotal } from "./scores/scoresViewShared";

type Props = {
  contest: ContestView;
  theme: Theme;
  isMobile: boolean;
  center: ReactNode;
};

function effectivePlace(p: PerformanceWithScores): number | null {
  const pl = p.place as number | undefined | null;
  if (pl == null || pl <= 0) return null;
  return pl;
}

export function useContestHighlights(contest: ContestView | null) {
  return useMemo(() => {
    if (!contest) return { commission: null as PerformanceWithScores | null, official: null as PerformanceWithScores | null };

    const voted = contest.performances.filter((p) => p.scores.length > 0);
    const commission =
      voted.length > 0
        ? [...voted].sort(
            (a, b) => b.total_score - a.total_score || a.number - b.number
          )[0]
        : null;

    const official =
      contest.performances.find((p) => effectivePlace(p) === 1) ?? null;

    return { commission, official };
  }, [contest]);
}

export function ContestHeaderHighlights({ contest, theme, isMobile, center }: Props) {
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();
  const { commission, official } = useContestHighlights(contest);

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  const subColor = isLight ? "#64748b" : "#94a3b8";
  const textColor = isLight ? "#0f172a" : "#f1f5f9";

  if (isMobile) {
    return (
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
        {center}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            width: "100%",
          }}
        >
          <HighlightCard
            variant="commission"
            label="Фаворит жюри"
            performance={commission}
            emptyText="Нет оценок"
            supportsEmoji={supportsEmoji}
            isLight={isLight}
            isGray={isGray}
            subColor={subColor}
            textColor={textColor}
            isMobile
          />
          <HighlightCard
            variant="official"
            label="победитель"
            performance={official}
            emptyText="Нет мест"
            supportsEmoji={supportsEmoji}
            isLight={isLight}
            isGray={isGray}
            subColor={subColor}
            textColor={textColor}
            isMobile
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr)",
        gap: 16,
        width: "100%",
        alignItems: "center",
      }}
    >
      <HighlightCard
        variant="commission"
        label="Фаворит независимой комиссии"
        performance={commission}
        emptyText="Пока нет оценок"
        supportsEmoji={supportsEmoji}
        isLight={isLight}
        isGray={isGray}
        subColor={subColor}
        textColor={textColor}
        isMobile={false}
      />
      <div style={{ minWidth: 0, justifySelf: "center", width: "100%" }}>{center}</div>
      <HighlightCard
        variant="official"
        label="ПОБЕДИТЕЛЬ"
        performance={official}
        emptyText="Места ещё не объявлены"
        supportsEmoji={supportsEmoji}
        isLight={isLight}
        isGray={isGray}
        subColor={subColor}
        textColor={textColor}
        isMobile={false}
      />
    </div>
  );
}

function HighlightCard({
  variant,
  label,
  performance,
  emptyText,
  supportsEmoji,
  isLight,
  isGray,
  subColor,
  textColor,
  isMobile,
}: {
  variant: "commission" | "official";
  label: string;
  performance: PerformanceWithScores | null;
  emptyText: string;
  supportsEmoji: boolean;
  isLight: boolean;
  isGray: boolean;
  subColor: string;
  textColor: string;
  isMobile: boolean;
}) {
  const isCommission = variant === "commission";
  const place = performance ? effectivePlace(performance) : null;

  const cardStyle: CSSProperties = isCommission
    ? {
        background: isLight
          ? "linear-gradient(135deg, rgba(79, 124, 255, 0.12) 0%, rgba(124, 77, 255, 0.06) 100%)"
          : isGray
            ? "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)"
            : "linear-gradient(135deg, rgba(79, 124, 255, 0.22) 0%, rgba(124, 77, 255, 0.1) 100%)",
        border: isLight
          ? "1px solid rgba(79, 124, 255, 0.25)"
          : "1px solid rgba(79, 124, 255, 0.35)",
        boxShadow: isLight
          ? "0 8px 24px rgba(79, 124, 255, 0.12)"
          : "0 8px 28px rgba(79, 124, 255, 0.2)",
      }
    : {
        background: isLight
          ? "linear-gradient(135deg, rgba(250, 204, 21, 0.18) 0%, rgba(217, 119, 6, 0.08) 100%)"
          : isGray
            ? "linear-gradient(135deg, rgba(250, 204, 21, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%)"
            : "linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)",
        border: isLight
          ? "1px solid rgba(250, 204, 21, 0.45)"
          : "1px solid rgba(250, 204, 21, 0.35)",
        boxShadow: isLight
          ? "0 8px 24px rgba(250, 204, 21, 0.15)"
          : "0 8px 28px rgba(217, 119, 6, 0.2)",
      };

  const accentColor = isCommission
    ? isLight
      ? "#4f46e5"
      : "#93b4ff"
    : isLight
      ? "#b45309"
      : "#fcd34d";

  const icon = isCommission ? "🎙️" : "🏆";

  return (
    <div
      style={{
        ...cardStyle,
        borderRadius: 18,
        padding: isMobile ? "12px 14px" : "14px 16px",
        textAlign: isMobile ? "center" : isCommission ? "left" : "right",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: accentColor,
          marginBottom: 8,
          lineHeight: 1.3,
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "center" : isCommission ? "flex-start" : "flex-end",
          gap: 6,
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </div>

      {performance ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isMobile ? "center" : isCommission ? "flex-start" : "flex-end",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {supportsEmoji && (
              <span style={{ fontSize: 26, lineHeight: 1 }}>{performance.country.flag_emoji}</span>
            )}
            <span
              style={{
                fontSize: isMobile ? 16 : 17,
                fontWeight: 800,
                color: textColor,
                lineHeight: 1.2,
              }}
            >
              {performance.country.name_ru}
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: subColor,
              lineHeight: 1.35,
              textAlign: isMobile ? "center" : isCommission ? "left" : "right",
            }}
          >
            {performance.artist}
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: isMobile ? "center" : isCommission ? "flex-start" : "flex-end",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {isCommission ? (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: accentColor,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: isLight ? "rgba(79, 124, 255, 0.12)" : "rgba(79, 124, 255, 0.2)",
                }}
              >
                средняя оценка {formatTotal(performance.total_score)}
              </span>
            ) : (
              place != null && (
                <span style={placeBadgeStyle(place, isLight, isGray)}>{placeLabel(place)}</span>
              )
            )}
          </div>
        </>
      ) : (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: subColor,
            fontStyle: "italic",
            textAlign: isMobile ? "center" : isCommission ? "left" : "right",
          }}
        >
          {emptyText}
        </div>
      )}
    </div>
  );
}

function placeLabel(place: number) {
  if (place === 1) return "1-е место";
  if (place === 2) return "2-е место";
  if (place === 3) return "3-е место";
  return `${place} место`;
}

function placeBadgeStyle(place: number, isLight: boolean, isGray: boolean): CSSProperties {
  const base: CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    padding: "4px 10px",
    borderRadius: 8,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
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
