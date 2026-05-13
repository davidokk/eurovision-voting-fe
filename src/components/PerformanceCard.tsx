import { useState } from "react";
import type { PerformanceWithScores, Theme } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";

type Props = {
  performance: PerformanceWithScores;
  votingStarted: boolean;
  votingEnded: boolean;
  theme?: Theme;
};

type GifItem = {
  id: string;
  title?: string;
  url: string;
};

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com.*v=)([^&?/]+)/i);
  return match?.[1] || null;
}

// Хелпер для получения цвета от 1 (красный) до 10 (зеленый)
function getScoreColor(score: number) {
  const hue = ((score - 1) * 120) / 9; // 0 = красный, 120 = зеленый
  return `hsl(${hue}, 80%, 45%)`;
}

export function PerformanceCard({
  performance,
  votingStarted,
  votingEnded,
  theme = "dark-blue",
}: Props) {
  const ENABLE_GIFS = true;
  const token = localStorage.getItem("token");
  const myUsername = localStorage.getItem("username");

  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);

  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const API_URL = (import.meta as any).env?.VITE_API_URL || "";
  const GIPHY_KEY = (import.meta as any).env?.VITE_GIPHY_KEY || "";

  const supportsEmoji = getDoesBrowserSupportFlagEmojis();

  function getScoreEmoji(score: number) {
    if (score <= 3) return "💩";
    if (score <= 6) return "😕";
    if (score <= 7) return "🙂";
    if (score <= 9) return "🔥";
    return "😍";
  }

  // Форматирование числа: убираем лишние нули после точки
  const formatScore = (num: number) => Number(num.toFixed(2));

  async function loadLocalGifs() {
    try {
      setLoadingGifs(true);
      const res = await fetch("/gifs.json");
      if (res.ok) {
        const data = await res.json();
        const normalized: GifItem[] = (data || []).map((g: any) => ({
          id: g.id,
          title: g.title,
          url: g.image,
        }));
        setGifs(normalized);
      }
    } catch (e) {
      console.error("Failed to load local gifs", e);
    } finally {
      setLoadingGifs(false);
    }
  }

  async function searchGifs(query: string) {
    if (!query.trim() || !GIPHY_KEY) return;
    setLoadingGifs(true);
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(
          query
        )}&limit=50&rating=pg`
      );
      const data = await res.json();
      const normalized: GifItem[] = (data.data || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        url: g.images?.fixed_height_small?.url || g.images?.original?.url,
      }));
      setGifs(normalized);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGifs(false);
    }
  }

  async function submit() {
    if (!token) return;
    if (score === null) {
      setShowErrorAnimation(true);
      setTimeout(() => setShowErrorAnimation(false), 1000);
      return;
    }
    setError(null);
    setSubmitting(true);
    const currentScore = score;
    setScore(null);
    try {
      if (API_URL) {
        const res = await fetch(
          `${API_URL}/v1/performance/${performance.performance_id}/rate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              score: Number(currentScore),
              comment: comment || "",
              gif_url: selectedGif,
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || "Ошибка при отправке оценки");
        }
      }
      setOpen(false);
      setScore(null);
      setComment("");
      setGifSearch("");
      setGifs([]);
      setSelectedGif(null);
      setError(null);
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

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

  const modalOverlayBg = isLight ? "rgba(0, 0, 0, 0.4)" : "rgba(2, 6, 23, 0.9)";
  const modalPaperBg = isLight ? "#ffffff" : isGray ? "#1c1c1c" : "#0f172a";
  const modalPaperBorder = isLight ? "1px solid #cbd5e1" : isGray ? "1px solid #374151" : "1px solid #334155";
  const modalHeadingColor = isLight ? "#0f172a" : "#fff";

  const ratingBtnInactiveBg = isLight ? "#f1f5f9" : isGray ? "#282828" : "#1e293b";
  const ratingBtnInactiveText = isLight ? "#0f172a" : "#fff";
  const ratingBtnInactiveBorder = isLight ? "#cbd5e1" : isGray ? "#374151" : "#334155";

  const textareaBg = isLight ? "#f8fafc" : isGray ? "#282828" : "#1e293b";
  const textareaBorder = isLight ? "1px solid #cbd5e1" : isGray ? "1px solid #374151" : "1px solid #334155";
  const textareaColor = isLight ? "#0f172a" : "#fff";

  const gifPickerBg = isLight ? "#f8fafc" : isGray ? "#282828" : "#1e293b";
  const gifSearchColor = isLight ? "#0f172a" : "#fff";
  const gifSearchBorder = isLight ? "2px solid #cbd5e1" : isGray ? "2px solid #374151" : "2px solid #334155";

  const btnSecBg = "transparent";
  const btnSecColor = isLight ? "#64748b" : isGray ? "#9ca3af" : "#94a3b8";
  const btnSecBorder = isLight ? "2px solid #cbd5e1" : isGray ? "2px solid #374151" : "2px solid #334155";

  return (
    <div style={{ ...styles.card, background: cardBg, border: cardBorder, color: cardTextColor }}>
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
            <span style={styles.number}>#{performance.number}</span>
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
            onClick={() => {
              setOpen(true);
              loadLocalGifs();
            }}
          >
            ОЦЕНИТЬ
          </button>
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
                  <div style={{
                    ...styles.feedScoreBadge,
                    background: isMe ? badgeMeBg : badgeBg,
                    border: isMe ? badgeMeBorder : badgeBorder,
                    ...(isMe ? { boxShadow: isLight ? "none" : "0 0 12px rgba(79, 124, 255, 0.15)" } : {}),
                  }}>
                    <span style={{...styles.feedScoreNum, color: getScoreColor(s.score)}}>
                      {s.score}
                    </span>
                    <span style={styles.feedEmojiSmall}>{getScoreEmoji(s.score)}</span>
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

      {/* RATING MODAL */}
      {open && (
        <div style={{ ...styles.modal, background: modalOverlayBg }}>
          <div style={{
            ...styles.modalPaper,
            background: modalPaperBg,
            border: modalPaperBorder,
            padding: "24px 28px 20px",
            boxShadow: "0 30px 80px rgba(0,0,0,0.5), inset 0 1px rgba(255, 255, 255, 0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            boxSizing: "border-box",
            maxHeight: "85vh",
          }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 32,
                height: 32,
                borderRadius: 12,
                border: "none",
                background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)",
                color: isLight ? "#64748b" : "#94a3b8",
                cursor: "pointer",
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>

            {/* Иконка в стиле AuthModal */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: isLight ? "linear-gradient(135deg, rgba(55, 65, 81, 0.15), rgba(75, 85, 99, 0.15))" : isGray ? "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))" : "linear-gradient(135deg, rgba(79, 124, 255, 0.2), rgba(124, 77, 255, 0.2))",
              border: isLight ? "1px solid rgba(55, 65, 81, 0.2)" : isGray ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(79, 124, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              boxShadow: isLight ? "0 4px 16px rgba(55, 65, 81, 0.1)" : "0 4px 16px rgba(79, 124, 255, 0.15)",
              fontSize: 22,
            }}>
              ⭐
            </div>

            <h2 style={{ margin: "0 0 4px 0", fontSize: 20, fontWeight: 900, color: modalHeadingColor, textAlign: "center", letterSpacing: "-0.02em" }}>
              Оценка выступления
            </h2>
            <p style={{ margin: "0 0 16px 0", color: isLight ? "#64748b" : "#94a3b8", fontSize: 13, textAlign: "center", lineHeight: 1.4, maxWidth: 360 }}>
              Оцените выступление по 10-балльной шкале и поделитесь впечатлениями
            </p>

            {error && <div style={styles.errorBanner}>{error}</div>}
            
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(10, 1fr)",
                gap: 4,
                marginBottom: 16,
                width: "100%",
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setScore(n);
                    setShowErrorAnimation(false);
                  }}
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: 10,
                    background: score === n ? getScoreColor(n) : ratingBtnInactiveBg,
                    color: score === n ? "#fff" : ratingBtnInactiveText,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: "pointer",
                    transform: score === n ? "scale(1.12)" : "scale(1)",
                    border: score === n ? "2px solid #fff" : showErrorAnimation ? "2px solid #ff6b6b" : `1px solid ${ratingBtnInactiveBorder}`,
                    transition: "all 0.2s ease",
                    padding: 0,
                    boxShadow: score === n ? `0 4px 12px ${getScoreColor(n)}` : showErrorAnimation ? "0 0 10px rgba(255, 107, 107, 0.5)" : "none",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Твой комментарий (необязательно)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ ...styles.modalTextarea, background: textareaBg, border: textareaBorder, color: textareaColor, minHeight: 60, marginBottom: 12, padding: 12, fontSize: 14 }}
            />
            {ENABLE_GIFS && (
              <div style={{ ...styles.gifPicker, background: gifPickerBg, width: "100%", padding: 10, marginBottom: 16 }}>
                <div style={{ ...styles.gifSearchBox, marginBottom: 8 }}>
                  <input
                    placeholder="Найди гифку для реакции..."
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    style={{ ...styles.gifSearchInput, color: gifSearchColor, borderBottom: gifSearchBorder, padding: 6, fontSize: 14 }}
                  />
                  <button onClick={() => searchGifs(gifSearch)} style={{ ...styles.gifSearchBtn, fontSize: 16 }}>🔍</button>
                </div>
                <div style={{ ...styles.gifScroll, paddingBottom: 4 }}>
                  {loadingGifs && <div style={{textAlign: 'center', padding: 8, color: gifSearchColor, width: "100%", fontSize: 13}}>Ищем...</div>}
                  {gifs.map((gif) => (
                    <img
                      key={gif.id}
                      src={gif.url}
                      onClick={() => setSelectedGif(gif.url)}
                      style={{
                        ...styles.gifThumb,
                        height: 48,
                        border: selectedGif === gif.url ? `3px solid ${isLight ? "#374151" : "#4f7cff"}` : "none"
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div style={{ ...styles.modalFooter, width: "100%" }}>
              <button onClick={() => setOpen(false)} style={{ ...styles.btnSecondary, background: btnSecBg, color: btnSecColor, border: btnSecBorder, padding: "10px 0" }}>Закрыть</button>
              <button
                onClick={submit}
                style={{
                  ...styles.btnPrimary,
                  padding: "10px 0",
                  background: isLight ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)" : isGray ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)" : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
                  boxShadow: isLight ? "0 8px 24px rgba(31, 41, 55, 0.25)" : isGray ? "0 8px 24px rgba(0, 0, 0, 0.4)" : "0 8px 24px rgba(79, 124, 255, 0.35)",
                }}
              >
                Подтвердить
              </button>
            </div>

            {/* Вращающийся кружочек загрузки (spinner) поверх окна */}
            {submitting && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  border: "4px solid rgba(255,255,255,0.2)",
                  borderTopColor: isLight ? "#1f2937" : "#4f7cff",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            )}
          </div>
        </div>
      )}
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

  modal: { position: "fixed", inset: 0, backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "10px" },
  modalPaper: { width: "100%", maxWidth: "480px", borderRadius: "24px", padding: "20px", maxHeight: "95vh", overflowY: "auto", boxSizing: "border-box" },
  modalHeading: { fontSize: "20px", fontWeight: 900, textAlign: "center", marginBottom: "20px" },
  ratingGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "20px" },
  ratingButton: { aspectRatio: "1/1", borderRadius: "12px", border: "2px solid transparent", fontSize: "18px", fontWeight: 900, cursor: "pointer", transition: "all 0.2s ease" },
  modalTextarea: { width: "100%", borderRadius: "16px", padding: "16px", minHeight: "80px", marginBottom: "16px", boxSizing: "border-box", fontSize: "16px", outline: "none" },
  gifPicker: { borderRadius: "16px", padding: "12px", marginBottom: "20px", boxSizing: "border-box" },
  gifSearchBox: { display: "flex", gap: "8px", marginBottom: "12px" },
  gifSearchInput: { flex: 1, background: "transparent", border: "none", padding: "8px", outline: "none", fontSize: "16px" },
  gifSearchBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "18px" },
  gifScroll: { display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" },
  gifThumb: { height: "60px", borderRadius: "8px", cursor: "pointer", flexShrink: 0 },
  modalFooter: { display: "flex", gap: "12px" },
  btnSecondary: { flex: 1, padding: "12px", borderRadius: "14px", fontWeight: 800, cursor: "pointer", fontSize: "12px", transition: "opacity 0.2s" },
  btnPrimary: { flex: 2, color: "#fff", border: "none", padding: "12px", borderRadius: "14px", fontWeight: 900, cursor: "pointer", fontSize: "12px", transition: "opacity 0.2s" },
  errorBanner: { background: "rgba(239, 68, 68, 0.15)", color: "#f87171", padding: "12px", borderRadius: "12px", marginBottom: "16px", fontSize: "14px", textAlign: "center" },
};
