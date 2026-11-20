import { useMemo, type ReactNode } from "react";
import type { CSSProperties } from "react";
import { Mic2, Trophy } from "lucide-react";
import type { ContestView, PerformanceWithScores, Theme } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { formatTotal } from "./scores/scoresViewShared";

type Props = {
  contest: ContestView;
  theme: Theme;
  isMobile: boolean;
  center?: ReactNode | null;
};

function effectivePlace(p: PerformanceWithScores): number | null {
  const pl = p.place as number | undefined | null;
  if (pl == null || pl <= 0) return null;
  return pl;
}

export function useContestHighlights(contest: ContestView | null) {
  return useMemo(() => {
    if (!contest) {
      return {
        commission: null as PerformanceWithScores | null,
        official: null as PerformanceWithScores | null,
        commissionTop: [] as PerformanceWithScores[],
        officialTop: [] as PerformanceWithScores[],
      };
    }

    const commissionTop = contest.performances
      .filter((p) => p.scores.length > 0)
      .sort((a, b) => b.total_score - a.total_score || a.number - b.number)
      .slice(0, 3);

    const officialTop = contest.performances
      .filter((p) => {
        const place = effectivePlace(p);
        return place != null && place <= 3;
      })
      .sort((a, b) => (effectivePlace(a) ?? 99) - (effectivePlace(b) ?? 99))
      .slice(0, 3);

    return {
      commission: commissionTop[0] ?? null,
      official: officialTop[0] ?? null,
      commissionTop,
      officialTop,
    };
  }, [contest]);
}

export function ContestHeaderHighlights({ contest, theme, isMobile, center }: Props) {
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();
  const { commission, official, commissionTop, officialTop } = useContestHighlights(contest);

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  const subColor = isLight ? "#5a6b80" : "#8fa0b8";
  const textColor = isLight ? "#0f1a2a" : "#eef2f7";

  if (isMobile) {
    const line = isLight ? "rgba(15,26,42,0.08)" : "rgba(255,255,255,0.08)";
    const semifinal = contest.contest.type.includes("semifinal");
    return (
      <div className="contest-hero__picks">
        <Podium
          variant="commission"
          label="Фаворит жюри"
          items={commissionTop}
          emptyText="Нет оценок"
          supportsEmoji={supportsEmoji}
          isLight={isLight}
          isGray={isGray}
          subColor={subColor}
          textColor={textColor}
          line={line}
        />
        {!semifinal && (
          <Podium
            variant="official"
            label="Победитель"
            items={officialTop}
            emptyText="Нет мест"
            supportsEmoji={supportsEmoji}
            isLight={isLight}
            isGray={isGray}
            subColor={subColor}
            textColor={textColor}
            line={line}
          />
        )}
      </div>
    );
  }

  if (!center) {
    const line = isLight ? "rgba(15,26,42,0.08)" : "rgba(255,255,255,0.08)";
    const semifinal = contest.contest.type.includes("semifinal");
    return (
      <div className="contest-hero__picks">
        <Podium
          variant="commission"
          label="Фаворит жюри"
          items={commissionTop}
          emptyText="Пока нет оценок"
          supportsEmoji={supportsEmoji}
          isLight={isLight}
          isGray={isGray}
          subColor={subColor}
          textColor={textColor}
          line={line}
        />
        {!semifinal && (
          <Podium
            variant="official"
            label="Победитель"
            items={officialTop}
            emptyText="Места ещё не объявлены"
            supportsEmoji={supportsEmoji}
            isLight={isLight}
            isGray={isGray}
            subColor={subColor}
            textColor={textColor}
            line={line}
          />
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr)",
        gap: 18,
        width: "100%",
        alignItems: "stretch",
      }}
    >
      <HighlightCard
        variant="commission"
        label="Фаворит жюри"
        performance={commission}
        emptyText="Пока нет оценок"
        supportsEmoji={supportsEmoji}
        isLight={isLight}
        isGray={isGray}
        subColor={subColor}
        textColor={textColor}
        isMobile={false}
      />
      <div style={{ minWidth: 0, alignSelf: "center", width: "100%" }}>{center}</div>
      <HighlightCard
        variant="official"
        label="Победитель"
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

function Podium({
  variant,
  label,
  items,
  emptyText,
  supportsEmoji,
  isLight,
  isGray,
  subColor,
  textColor,
  line,
}: {
  variant: "commission" | "official";
  label: string;
  items: PerformanceWithScores[];
  emptyText: string;
  supportsEmoji: boolean;
  isLight: boolean;
  isGray: boolean;
  subColor: string;
  textColor: string;
  line: string;
}) {
  const isCommission = variant === "commission";
  const accent = isCommission ? (isLight ? "#0d7377" : "#7dd3d8") : isLight ? "#b45309" : "#e8b931";
  const Icon = isCommission ? Mic2 : Trophy;
  const ink = isLight ? "#ffffff" : "#102018";

  return (
    <section
      className={`contest-hero__podium contest-hero__podium--${variant}`}
      style={{
        background: isLight ? "rgba(255,255,255,0.72)" : isGray ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.05)",
        border: isLight ? "1px solid rgba(15,26,42,0.1)" : "1px solid rgba(255,255,255,0.1)",
        ["--pick" as string]: accent,
        ["--pick-ink" as string]: ink,
        ["--line" as string]: line,
      }}
    >
      <div className="contest-hero__podium-head" style={{ color: accent }}>
        <Icon size={14} strokeWidth={2.4} />
        <span>{label}</span>
      </div>

      {items.length === 0 ? (
        <div className="contest-hero__podium-empty" style={{ color: subColor }}>
          {emptyText}
        </div>
      ) : (
        <ol className="contest-hero__podium-list">
          {Array.from({ length: 3 }, (_, index) => items[index] ?? null).map((performance, index) => {
            if (!performance) {
              return (
                <li key={`empty-${index}`} className="contest-hero__podium-row" aria-hidden>
                  <span className="contest-hero__rank" style={{ visibility: "hidden" }} />
                </li>
              );
            }
            const place = effectivePlace(performance);
            const rank = isCommission ? index + 1 : place ?? index + 1;
            return (
              <li key={performance.performance_id} className="contest-hero__podium-row">
                <span className={`contest-hero__rank contest-hero__rank--${rank}`}>{rank}</span>
                <div className="contest-hero__podium-who">
                  <div className="contest-hero__podium-country" style={{ color: textColor }}>
                    {supportsEmoji && <span className="contest-hero__pick-flag">{performance.country.flag_emoji}</span>}
                    <span>{performance.country.name_ru}</span>
                  </div>
                  <div className="contest-hero__podium-artist" style={{ color: subColor }}>
                    {performance.artist}
                  </div>
                </div>
                {isCommission && (
                  <span className="contest-hero__podium-score" style={{ color: accent }}>
                    {formatTotal(performance.total_score)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
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

  const cardStyle: CSSProperties = {
    background: isLight
      ? "rgba(255,255,255,0.7)"
      : isGray
        ? "rgba(255,255,255,0.04)"
        : "rgba(255,255,255,0.05)",
    border: isLight ? "1px solid rgba(15,26,42,0.1)" : "1px solid rgba(255,255,255,0.1)",
  };

  const accentColor = isCommission
    ? isLight
      ? "#0d7377"
      : "#7dd3d8"
    : isLight
      ? "#b45309"
      : "#e8b931";

  const Icon = isCommission ? Mic2 : Trophy;

  const mark = performance ? (
    isCommission ? (
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: accentColor,
          padding: "6px 10px",
          borderRadius: 10,
          background: isLight ? "rgba(13,115,119,0.1)" : "rgba(125,211,216,0.12)",
          display: "inline-block",
        }}
      >
        {formatTotal(performance.total_score)}
      </span>
    ) : (
      place != null && <span style={placeBadgeStyle(place, isLight, isGray)}>{placeLabel(place)}</span>
    )
  ) : null;

  if (!isMobile) {
    return (
      <div className={`contest-hero__pick contest-hero__pick--${variant}`} style={{ ...cardStyle, ["--pick" as string]: accentColor }}>
        <div className="contest-hero__pick-copy">
          <div className="contest-hero__pick-label" style={{ color: accentColor }}>
            <Icon size={14} strokeWidth={2.4} />
            <span>{label}</span>
          </div>
          {performance ? (
            <>
              <div className="contest-hero__pick-country" style={{ color: textColor }}>
                {supportsEmoji && <span className="contest-hero__pick-flag">{performance.country.flag_emoji}</span>}
                <span>{performance.country.name_ru}</span>
              </div>
              <div className="contest-hero__pick-artist" style={{ color: subColor }}>
                {performance.artist}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 600, color: subColor, fontStyle: "italic" }}>{emptyText}</div>
          )}
        </div>
        {mark ? <div className="contest-hero__pick-mark">{mark}</div> : null}
      </div>
    );
  }

  return (
    <div
      style={{
        ...cardStyle,
        borderRadius: 16,
        padding: "12px 12px",
        textAlign: "left",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: accentColor,
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <Icon size={14} strokeWidth={2.4} />
        <span>{label}</span>
      </div>

      {performance ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {supportsEmoji && (
              <span style={{ fontSize: 22, lineHeight: 1 }}>{performance.country.flag_emoji}</span>
            )}
            <span
              style={{
                fontFamily: '"Syne", sans-serif',
                fontSize: isMobile ? 15 : 17,
                fontWeight: 800,
                color: textColor,
                lineHeight: 1.2,
              }}
            >
              {performance.country.name_ru}
            </span>
          </div>
          <div style={{ fontSize: 13, color: subColor, lineHeight: 1.35 }}>
            {performance.artist}
          </div>
          <div style={{ marginTop: "auto" }}>
            {isCommission ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: accentColor,
                  padding: "5px 10px",
                  borderRadius: 8,
                  background: isLight ? "rgba(13,115,119,0.1)" : "rgba(125,211,216,0.12)",
                  display: "inline-block",
                }}
              >
                {formatTotal(performance.total_score)}
              </span>
            ) : (
              place != null && (
                <span style={placeBadgeStyle(place, isLight, isGray)}>{placeLabel(place)}</span>
              )
            )}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, fontWeight: 600, color: subColor, fontStyle: "italic" }}>
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
    padding: "5px 10px",
    borderRadius: 8,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    display: "inline-block",
  };
  if (place === 1) return { ...base, background: "#facc15", color: "#000" };
  if (place === 2) return { ...base, background: "#94a3b8", color: "#fff" };
  if (place === 3) return { ...base, background: "#d97706", color: "#fff" };
  return {
    ...base,
    background: isLight ? "#0f1a2a" : isGray ? "#374151" : "#e8b931",
    color: isLight ? "#fff" : isGray ? "#fff" : "#0b1528",
  };
}
