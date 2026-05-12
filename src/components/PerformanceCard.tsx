import { useState } from "react";
import type { PerformanceWithScores } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";

type Props = {
  performance: PerformanceWithScores;
  votingStarted: boolean;
  votingEnded: boolean;
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
}: Props) {
  const ENABLE_GIFS = true;
  const token = localStorage.getItem("token");

  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);

  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [loadingGifs, setLoadingGifs] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY;

  const supportsEmoji = getDoesBrowserSupportFlagEmojis();

  function getScoreEmoji(score: number) {
    if (score <= 3) return "💩";
    if (score <= 6) return "😕";
    if (score <= 7) return "🙂";
    if (score <= 9) return "🔥";
    return "😍";
  }

  async function loadLocalGifs() {
    try {
      setLoadingGifs(true);
      const res = await fetch("/gifs.json");
      const data = await res.json();
      const normalized: GifItem[] = (data || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        url: g.image,
      }));
      setGifs(normalized);
    } catch (e) {
      console.error("Failed to load local gifs", e);
    } finally {
      setLoadingGifs(false);
    }
  }

  async function searchGifs(query: string) {
    if (!query.trim()) return;
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
    try {
      const res = await fetch(
        `${API_URL}/v1/performance/${performance.performance_id}/rate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            score: Number(score),
            comment: comment || "",
            gif_url: selectedGif,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Ошибка при отправке оценки");
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
    }
  }

  const youtubeId = performance.youtube_link ? getYouTubeId(performance.youtube_link) : null;
  const avgColor = getScoreColor(performance.total_score);

  return (
    <div style={styles.card}>
      {/* 1. TOP ROW: Country Stack (Left Aligned) & Dynamic Score */}
      <div style={styles.topRow}>
        <div style={{
            ...styles.mainScoreBox,
            background: `linear-gradient(135deg, ${avgColor} 0%, #0f172a 150%)`
        }}>
          <div style={styles.mainScoreLabel}>БАЛЛ</div>
          <div style={styles.mainScoreValue}>{performance.total_score.toFixed(2)}</div>
        </div>
        
        <div style={styles.countryInfo}>
          <div style={styles.countryStack}>
            <span style={styles.number}>#{performance.number}</span>
            <div style={styles.countryNameRow}>
                {supportsEmoji && <span style={styles.flag}>{performance.country.flag_emoji}</span>}
                <span style={styles.countryName}>{performance.country.name_ru}</span>
            </div>
          </div>
        </div>

        {token && votingStarted && !votingEnded && (
          <button
            style={styles.rateBtn}
            onClick={() => {
              setOpen(true);
              loadLocalGifs();
            }}
          >
            ОЦЕНИТЬ
          </button>
        )}
      </div>

      {/* 2. HERO SECTION: Video & Left-Aligned Track Info (Vertically Centered) */}
      <div style={styles.heroSection}>
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
          <div style={styles.artistName}>{performance.artist}</div>
          <div style={styles.songTitle}>{performance.song}</div>
        </div>
      </div>

      {/* 3. FEED OF SCORES */}
      <div style={styles.feed}>
        {performance.scores.length === 0 ? (
          <div style={styles.emptyFeed}>Пока никто не проголосовал</div>
        ) : (
          <div style={styles.feedList}>
            {performance.scores.map((s, i) => (
              <div key={i} style={styles.feedItem}>
                <div style={styles.feedScoreBadge}>
                  <span style={{...styles.feedScoreNum, color: getScoreColor(s.score)}}>
                    {s.score}
                  </span>
                  <span style={styles.feedEmojiSmall}>{getScoreEmoji(s.score)}</span>
                </div>
                
                <div style={styles.feedContent}>
                  <div style={styles.feedUser}>{s.username}</div>
                  {s.comment && <div style={styles.feedComment}>«{s.comment}»</div>}
                </div>

                {s.gif_url && (
                  <div style={styles.feedGifContainer}>
                    <img src={s.gif_url} style={styles.feedGif} alt="reaction" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {open && (
        <div style={styles.modal}>
          <div style={styles.modalPaper}>
            <h2 style={styles.modalHeading}>Выстави свой балл</h2>
            {error && <div style={styles.errorBanner}>{error}</div>}
            <div style={{
                ...styles.ratingGrid,
                outline: showErrorAnimation ? "3px solid #ff6b6b" : "none"
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setScore(n);
                    setShowErrorAnimation(false);
                  }}
                  style={{
                    ...styles.ratingButton,
                    background: score === n ? getScoreColor(n) : "#1e293b",
                    transform: score === n ? "scale(1.1)" : "scale(1)",
                    borderColor: score === n ? "#fff" : "#334155"
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
              style={styles.modalTextarea}
            />
            {ENABLE_GIFS && (
              <div style={styles.gifPicker}>
                <div style={styles.gifSearchBox}>
                  <input
                    placeholder="Найди гифку для реакции..."
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    style={styles.gifSearchInput}
                  />
                  <button onClick={() => searchGifs(gifSearch)} style={styles.gifSearchBtn}>🔍</button>
                </div>
                <div style={styles.gifScroll}>
                  {loadingGifs && <div style={{textAlign: 'center', padding: 10}}>Ищем...</div>}
                  {gifs.map((gif) => (
                    <img
                      key={gif.id}
                      src={gif.url}
                      onClick={() => setSelectedGif(gif.url)}
                      style={{
                        ...styles.gifThumb,
                        border: selectedGif === gif.url ? "3px solid #4f7cff" : "none"
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div style={styles.modalFooter}>
              <button onClick={() => setOpen(false)} style={styles.btnSecondary}>ЗАКРЫТЬ</button>
              <button onClick={submit} style={styles.btnPrimary}>ПОДТВЕРДИТЬ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#0f172a",
    padding: "20px",
    borderRadius: "28px",
    color: "#e2e8f0",
    border: "1px solid #1e293b",
    fontFamily: "'Inter', sans-serif",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
    gap: "12px",
  },
  mainScoreBox: {
    padding: "8px 16px",
    borderRadius: "16px",
    textAlign: "center",
    minWidth: "75px",
    transition: "background 0.3s ease",
  },
  mainScoreLabel: {
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "1px",
    color: "rgba(255,255,255,0.7)",
  },
  mainScoreValue: {
    fontSize: "30px",
    fontWeight: 950,
    color: "#fff",
    lineHeight: "1",
  },
  countryInfo: {
    flex: "1 1 auto",
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
  countryName: {
    fontSize: "20px",
    fontWeight: 900,
    color: "#fff",
    letterSpacing: "-0.3px",
  },
  rateBtn: {
    background: "#fff",
    color: "#0f172a",
    border: "none",
    padding: "10px 18px",
    borderRadius: "14px",
    fontWeight: 900,
    fontSize: "12px",
    cursor: "pointer",
  },
  heroSection: {
    display: "flex",
    alignItems: "stretch", 
    gap: "16px",
    marginBottom: "20px",
    background: "rgba(30, 41, 59, 0.3)",
    padding: "12px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  videoBox: {
    width: "160px",
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
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center", 
    textAlign: "left",
  },
  artistName: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#fff",
    lineHeight: "1.2",
    marginBottom: "4px",
  },
  songTitle: {
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: "1.4",
  },
  feed: {
    background: "rgba(15, 23, 42, 0.4)",
    borderRadius: "20px",
    padding: "16px",
    border: "1px solid #1e293b",
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
    padding: "6px 0",
    borderBottom: "1px solid #1e293b",
  },
  feedScoreBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "#1e293b",
    padding: "5px 10px",
    borderRadius: "12px",
    minWidth: "55px",
    justifyContent: "center",
    border: "1px solid #334155",
  },
  feedScoreNum: { 
    fontSize: "17px", 
    fontWeight: 900, 
  },
  feedEmojiSmall: { fontSize: "14px" },
  feedContent: { flex: 1 },
  feedUser: { 
    fontSize: "15px", 
    fontWeight: 700, 
    color: "#f1f5f9" 
  },
  feedComment: { 
    fontSize: "14px", 
    color: "#94a3b8", 
    fontStyle: "italic",
    marginTop: "2px"
  },
  feedGifContainer: {
    width: "55px",
    height: "40px",
    borderRadius: "6px",
    overflow: "hidden",
  },
  feedGif: { width: "100%", height: "100%", objectFit: "cover" },
  emptyFeed: { textAlign: "center", padding: "10px", color: "#475569", fontSize: "12px" },

  modal: { position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.9)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modalPaper: { background: "#0f172a", width: "100%", maxWidth: "480px", borderRadius: "32px", padding: "32px", border: "1px solid #334155" },
  modalHeading: { fontSize: "24px", fontWeight: 900, textAlign: "center", marginBottom: "24px" },
  ratingGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "24px" },
  ratingButton: { aspectRatio: "1/1", borderRadius: "16px", border: "2px solid transparent", color: "#fff", fontSize: "20px", fontWeight: 900, cursor: "pointer", transition: "all 0.2s ease" },
  modalTextarea: { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "16px", color: "#fff", minHeight: "100px", marginBottom: "20px" },
  gifPicker: { background: "#1e293b", borderRadius: "16px", padding: "12px", marginBottom: "24px" },
  gifSearchBox: { display: "flex", gap: "8px", marginBottom: "12px" },
  gifSearchInput: { flex: 1, background: "transparent", border: "none", borderBottom: "2px solid #334155", color: "#fff", padding: "8px", outline: "none" },
  gifSearchBtn: { background: "none", border: "none", cursor: "pointer" },
  gifScroll: { display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" },
  gifThumb: { height: "60px", borderRadius: "8px", cursor: "pointer", flexShrink: 0 },
  modalFooter: { display: "flex", gap: "16px" },
  btnSecondary: { flex: 1, background: "transparent", color: "#94a3b8", border: "2px solid #334155", padding: "14px", borderRadius: "16px", fontWeight: 800, cursor: "pointer" },
  btnPrimary: { flex: 2, background: "#4f7cff", color: "#fff", border: "none", padding: "14px", borderRadius: "16px", fontWeight: 900, cursor: "pointer" },
  errorBanner: { background: "rgba(239, 68, 68, 0.15)", color: "#f87171", padding: "12px", borderRadius: "12px", marginBottom: "16px", fontSize: "14px", textAlign: "center" },
};