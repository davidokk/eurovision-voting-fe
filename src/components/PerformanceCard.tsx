import { useState } from "react";
import type { PerformanceWithScores, ScoreView, Theme } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { RatePerformanceModal } from "./RatePerformanceModal";

type Props = {
  performance: PerformanceWithScores;
  votingStarted: boolean;
  votingEnded: boolean;
  theme?: Theme;
  contestType?: string;
  onRated?: () => void | Promise<void>;
};

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com.*v=)([^&?/]+)/i);
  return match?.[1] || null;
}

import { ScoreTwelveDisplay } from "./ScoreTwelveDisplay";
import { getScoreColor, isScoreTwelve } from "../utils/scoreUtils";
import { FavoriteButton } from "./FavoriteButton";

export function PerformanceCard({
  performance,
  votingStarted,
  votingEnded,
  theme = "dark-blue",
  contestType,
  onRated,
}: Props) {
  const token = localStorage.getItem("token");
  const myUsername = localStorage.getItem("username");
  const myUserId = localStorage.getItem("user_id");

  const [open, setOpen] = useState(false);

  function myScoreFor(p: PerformanceWithScores): ScoreView | undefined {
    if (!token || !myUserId) return undefined;
    return p.scores.find(
      (s) => s.user_id === myUserId || (myUsername && s.username === myUsername)
    );
  }

  const mine = myScoreFor(performance);

  const supportsEmoji = getDoesBrowserSupportFlagEmojis();

  // Форматирование числа: убираем лишние нули после точки
  const formatScore = (num: number) => Number(num.toFixed(2));

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  const youtubeId = performance.youtube_link ? getYouTubeId(performance.youtube_link) : null;
  const avgColor = getScoreColor(performance.total_score);

  const cardBg = isLight ? "#ffffff" : isGray ? "#181818" : "#0f172a";
  const cardBorder = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #2a2a2a" : "1px solid #1e293b";
  const cardTextColor = isLight ? "#0f172a" : "#e2e8f0";

  const scoreGradEnd = isLight ? "#f1f5f9" : isGray ? "#121212" : "#0f172a";
  const scoreLabelColor = isLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)";
  const scoreValueColor = isLight ? "#0f172a" : "#fff";

  const countryNameColor = isLight ? "#0f172a" : "#fff";

  const rateBtnBg = isLight ? "#374151" : isGray ? "#e5e7eb" : "#fff";
  const rateBtnColor = isLight ? "#fff" : isGray ? "#121212" : "#0f172a";

  const heroBg = isLight ? "rgba(241, 245, 249, 0.8)" : isGray ? "rgba(255, 255, 255, 0.03)" : "rgba(30, 41, 59, 0.3)";
  const heroBorder = isLight ? "1px solid rgba(0,0,0,0.05)" : "1px solid rgba(255,255,255,0.05)";

  const artistColor = isLight ? "#0f172a" : "#fff";
  const songColor = isLight ? "#64748b" : "#94a3b8";

  const feedBg = isLight ? "rgba(248, 250, 252, 0.6)" : isGray ? "rgba(20, 20, 20, 0.4)" : "rgba(15, 23, 42, 0.4)";
  const feedBorder = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #282828" : "1px solid #1e293b";
  const feedItemBorder = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #282828" : "1px solid #1e293b";

  const feedMeBg = isLight 
    ? "linear-gradient(135deg, rgba(55, 65, 81, 0.08), rgba(75, 85, 99, 0.04))" 
    : isGray 
    ? "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))" 
    : "linear-gradient(135deg, rgba(79, 124, 255, 0.12), rgba(124, 77, 255, 0.08))";

  const feedMeBorder = isLight ? "1px solid rgba(55, 65, 81, 0.25)" : isGray ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(79, 124, 255, 0.35)";

  const badgeBg = isLight ? "#f1f5f9" : isGray ? "#282828" : "#1e293b";
  const badgeBorder = isLight ? "1px solid #cbd5e1" : isGray ? "1px solid #374151" : "1px solid #334155";
  const badgeMeBg = isLight ? "rgba(55, 65, 81, 0.15)" : isGray ? "rgba(255, 255, 255, 0.12)" : "rgba(79, 124, 255, 0.2)";
  const badgeMeBorder = isLight ? "1px solid rgba(55, 65, 81, 0.3)" : isGray ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid rgba(79, 124, 255, 0.4)";

  const feedUserColor = isLight ? "#0f172a" : isGray ? "#f3f4f6" : "#f1f5f9";
  const feedUserMeColor = isLight ? "#1f2937" : isGray ? "#e5e7eb" : "#7aa2ff";
  const feedCommentColor = isLight ? "#64748b" : isGray ? "#9ca3af" : "#94a3b8";
  const emptyColor = isLight ? "#64748b" : isGray ? "#6b7280" : "#475569";

  const placeWords: Record<number, string> = {
    1: "Первое место",
    2: "Второе место",
    3: "Третье место",
  };

  const isSemifinal = contestType?.includes("semifinal");
  const hasPlace = performance.place !== undefined && performance.place !== null;
  const hasTwelveOnCard = performance.scores.some((s) => isScoreTwelve(s.score));

  return (
    <div
      className={hasTwelveOnCard ? "ev-score-12-card" : undefined}
      style={{ ...styles.card, background: cardBg, border: cardBorder, color: cardTextColor }}
    >
      {/* 1. TOP ROW: Country Stack & Dynamic Score */}
      <div style={styles.topRow}>
        <div style={{
            ...styles.mainScoreBox,
            background: `linear-gradient(135deg, ${avgColor} 0%, ${scoreGradEnd} 150%)`
        }}>
          <div style={{ ...styles.mainScoreLabel, color: scoreLabelColor }}>БАЛЛ</div>
          <div style={{ ...styles.mainScoreValue, color: scoreValueColor }}>
            {formatScore(performance.total_score)}
          </div>
        </div>
        
        <div style={styles.countryInfo}>
          <div style={styles.countryStack}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={styles.number}>#{performance.number}</span>

              {!isSemifinal && hasPlace && (
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  ...(performance.place! === 1 ? { background: "#facc15", color: "#000" } :
                      performance.place! === 2 ? { background: "#94a3b8", color: "#fff" } :
                      performance.place! === 3 ? { background: "#d97706", color: "#fff" } :
                      { background: isLight ? "#1f2937" : isGray ? "#374151" : "#4f7cff", color: "#fff" })
                }}>
                  {performance.place! <= 3 ? placeWords[performance.place!] : `${performance.place} место`}
                </span>
              )}

              {isSemifinal && (
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  ...(performance.qualified 
                      ? { background: "rgba(34, 197, 94, 0.15)", color: isLight ? "#166534" : "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)" } 
                      : { background: "rgba(239, 68, 68, 0.15)", color: isLight ? "#991b1b" : "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" })
                }}>
                  {performance.qualified ? "В финале" : "Не прошла"}
                </span>
              )}

            </div>
            <div style={styles.countryNameRow}>
                {supportsEmoji && <span style={styles.flag}>{performance.country.flag_emoji}</span>}
                <a
                    href={`/country/${performance.country.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...styles.countryNameLink, color: countryNameColor }}
                >
                    {performance.country.name_ru}
                </a>
            </div>
          </div>
        </div>

        {token && votingStarted && !votingEnded && (
          <button
            style={{ ...styles.rateBtn, background: rateBtnBg, color: rateBtnColor }}
            onClick={() => setOpen(true)}
          >
            ОЦЕНИТЬ
          </button>
        )}

        {token && (
          <FavoriteButton performanceId={performance.performance_id} size={20} theme={theme} />
        )}
      </div>

      {/* 2. HERO SECTION */}
      <div style={{ ...styles.heroSection, background: heroBg, border: heroBorder }}>
        {youtubeId && (
          <div style={styles.videoBox}>
            <a href={performance.youtube_link} target="_blank" rel="noreferrer" style={styles.videoLink}>
              <img
                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                style={styles.videoImg}
                alt="yt"
              />
              <div style={styles.videoOverlay}>
                <div style={styles.playIconSmall}>▶</div>
              </div>
            </a>
          </div>
        )}

        <div style={styles.trackDetails}>
          <div style={{ ...styles.artistName, color: artistColor }}>{performance.artist}</div>
          <div style={{ ...styles.songTitle, color: songColor }}>{performance.song}</div>
        </div>
      </div>

      {/* 3. FEED OF SCORES */}
      <div style={{ ...styles.feed, background: feedBg, border: feedBorder }}>
        {performance.scores.length === 0 ? (
          <div style={{ ...styles.emptyFeed, color: emptyColor }}>Пока никто не проголосовал</div>
        ) : (
          <div style={styles.feedList}>
            {performance.scores.map((s, i) => {
              const isMe = s.username === myUsername;

              return (
                <div
                  key={i}
                  style={{
                    ...styles.feedItem,
                    borderBottom: feedItemBorder,
                    ...(isMe ? {
                      background: feedMeBg,
                      border: feedMeBorder,
                      borderRadius: "14px",
                      padding: "10px 12px",
                      marginLeft: "-4px",
                      marginRight: "-4px",
                      boxShadow: isLight ? "0 4px 12px rgba(0,0,0,0.05)" : "0 0 16px rgba(79, 124, 255, 0.1)",
                    } : {}),
                  }}
                >
                  <div
                    style={{
                      ...styles.feedScoreBadge,
                      ...(isScoreTwelve(s.score)
                        ? { background: "transparent", border: "none", padding: 0 }
                        : {
                            background: isMe ? badgeMeBg : badgeBg,
                            border: isMe ? badgeMeBorder : badgeBorder,
                            ...(isMe
                              ? { boxShadow: isLight ? "none" : "0 0 12px rgba(79, 124, 255, 0.15)" }
                              : {}),
                          }),
                    }}
                  >
                    <ScoreTwelveDisplay
                      score={s.score}
                      variant="badge"
                      showEmoji
                      style={!isScoreTwelve(s.score) ? { ...styles.feedScoreNum, color: getScoreColor(s.score) } : undefined}
                    />
                  </div>
                  
                  <div style={styles.feedContent}>
                    <a
                      href={`/user/${s.user_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.feedUserLink,
                        ...styles.feedUser,
                        color: isMe ? feedUserMeColor : feedUserColor,
                      }}
                    >
                      {s.username}{isMe ? " (вы)" : ""}
                    </a>
                    {s.comment && <div style={{ ...styles.feedComment, color: feedCommentColor }}>«{s.comment}»</div>}
                  </div>

                  {s.gif_url && (
                    <div style={styles.feedGifContainer}>
                      <img src={s.gif_url} style={styles.feedGif} alt="reaction" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RatePerformanceModal
        performance={performance}
        theme={theme}
        open={open}
        onClose={() => setOpen(false)}
        initialScore={mine?.score ?? null}
        initialComment={mine?.comment ?? ""}
        initialGifUrl={mine?.gif_url ?? null}
        onSuccess={() => onRated?.()}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: "20px",
    borderRadius: "28px",
    fontFamily: "'Inter', sans-serif",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
    gap: "12px",
    flexWrap: "wrap",
  },
  mainScoreBox: {
    padding: "8px 16px",
    borderRadius: "16px",
    textAlign: "center",
    minWidth: "70px",
    transition: "background 0.3s ease",
    boxSizing: "border-box",
  },
  mainScoreLabel: {
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "1px",
  },
  mainScoreValue: {
    fontSize: "26px",
    fontWeight: 950,
    lineHeight: "1",
  },
  countryInfo: {
    flex: "1 1 auto",
    minWidth: "120px",
  },
  countryStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
  },
  countryNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  number: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#4f7cff",
    background: "rgba(79, 124, 255, 0.1)",
    padding: "2px 8px",
    borderRadius: "6px",
    textTransform: "uppercase",
  },
  flag: { fontSize: "24px" },
  countryNameLink: {
    fontSize: "18px",
    fontWeight: 900,
    letterSpacing: "-0.3px",
    textDecoration: "none",
    cursor: "pointer",
    transition: "color 0.2s ease",
  },
  rateBtn: {
    border: "none",
    padding: "10px 18px",
    borderRadius: "14px",
    fontWeight: 900,
    fontSize: "12px",
    cursor: "pointer",
    transition: "transform 0.2s ease",
  },
  heroSection: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center", 
    gap: "16px",
    marginBottom: "20px",
    padding: "12px",
    borderRadius: "20px",
    boxSizing: "border-box",
  },
  videoBox: {
    width: "100%",
    maxWidth: "160px",
    aspectRatio: "16 / 9",
    borderRadius: "12px",
    overflow: "hidden",
    position: "relative",
    border: "1px solid #334155",
    flexShrink: 0,
  },
  videoLink: { display: "block", height: "100%" },
  videoImg: { width: "100%", height: "100%", objectFit: "cover" },
  videoOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(15, 23, 42, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  playIconSmall: {
    background: "rgba(255,255,255,0.9)",
    color: "#0f172a",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    paddingLeft: "2px",
  },
  trackDetails: {
    flex: "1 1 150px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center", 
    textAlign: "left",
  },
  artistName: {
    fontSize: "18px",
    fontWeight: 800,
    lineHeight: "1.2",
    marginBottom: "4px",
  },
  songTitle: {
    fontSize: "14px",
    lineHeight: "1.4",
  },
  feed: {
    borderRadius: "20px",
    padding: "16px",
    boxSizing: "border-box",
  },
  feedList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  feedItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 0",
    boxSizing: "border-box",
  },
  feedScoreBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 8px",
    borderRadius: "12px",
    minWidth: "50px",
    justifyContent: "center",
    flexShrink: 0,
  },
  feedScoreNum: { 
    fontSize: "16px", 
    fontWeight: 900, 
  },
  feedEmojiSmall: { fontSize: "14px" },
  feedContent: { flex: 1, minWidth: 0 },
  feedUser: { 
    fontSize: "14px", 
    fontWeight: 700, 
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  feedUserLink: {
    textDecoration: "none",
    cursor: "pointer",
    display: "inline-block",
  },
  feedComment: { 
    fontSize: "13px", 
    fontStyle: "italic",
    marginTop: "2px",
    wordBreak: "break-word"
  },
  feedGifContainer: {
    width: "50px",
    height: "35px",
    borderRadius: "6px",
    overflow: "hidden",
    flexShrink: 0,
  },
  feedGif: { width: "100%", height: "100%", objectFit: "cover" },
  emptyFeed: { textAlign: "center", padding: "10px", fontSize: "12px" },
};
