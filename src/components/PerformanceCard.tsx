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
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com.*v=)([^&?/]+)/i
  );
  return match?.[1] || null;
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

  // GIF STATE
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

  // -----------------------------
  // LOAD LOCAL GIFS (from /public/gifs.json)
  // -----------------------------
  async function loadLocalGifs() {
    try {
      setLoadingGifs(true);

      const res = await fetch("/gifs.json");
      const data = await res.json();

      const normalized: GifItem[] = (data || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        url: g.image, // 👈 ВАЖНО: твой формат
      }));

      setGifs(normalized);
    } catch (e) {
      console.error("Failed to load local gifs", e);
    } finally {
      setLoadingGifs(false);
    }
  }

  // -----------------------------
  // SEARCH GIPHY
  // -----------------------------
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

  const youtubeId = performance.youtube_link
    ? getYouTubeId(performance.youtube_link)
    : null;

  return (
    <div style={styles.card}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.title}>
          <span style={styles.number}>#{performance.number}</span>

          <span style={styles.country}>
            {supportsEmoji ? performance.country.flag_emoji : ""}{" "}
            {performance.country.name_ru}
          </span>

          <span style={styles.total}>
            ⭐ {Number(performance.total_score.toFixed(2))}
          </span>
        </div>

        {token && votingStarted && !votingEnded && (
          <button
            style={styles.rateBtn}
            onClick={() => {
              setOpen(true);
              loadLocalGifs(); // 👈 вместо trending
            }}
          >
            Оценить
          </button>
        )}
      </div>

      {/* YOUTUBE */}
      {youtubeId && (
        <div style={styles.thumbnailWrapper}>
          <a
            href={performance.youtube_link}
            target="_blank"
            rel="noreferrer"
            style={styles.thumbnail}
          >
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
              style={styles.thumbnailImg}
            />
          </a>

          <a
            href={performance.youtube_link}
            target="_blank"
            rel="noreferrer"
            style={styles.youtubeOverlay}
          >
            ▶ YouTube
          </a>
        </div>
      )}

      {/* ARTIST */}
      <div style={styles.artist}>
        {performance.artist} — {performance.song}
      </div>

      {/* SCORES */}
      <div style={styles.scores}>
        {performance.scores.length === 0 && (
          <div style={styles.noScores}>Пока нет оценок</div>
        )}

        {performance.scores.map((s, i) => {
          const gif =
            s.gif_url;

          return (
            <div
              key={i}
              style={styles.scoreRow}
            >
              {/* LEFT SIDE */}
              <div style={styles.scoreLeft}>
                <div style={styles.user}>
                  <a
                    href={`/user/${s.user_id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.usernameLink}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.borderBottom =
                        "1px solid #4f7cff";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "#4f7cff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.borderBottom =
                        "1px solid transparent";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "#e6edf7";
                    }}
                  >
                    ⧉ {s.username}
                  </a>
                  <span style={styles.score}>
                    {getScoreEmoji(s.score)} {s.score}
                  </span>
                </div>

                {s.comment && (
                  <div style={styles.comment}>
                    "{s.comment}"
                  </div>
                )}
              </div>

              {/* RIGHT SIDE (GIF) */}
              {gif && (
                <img
                  src={gif}
                  style={styles.commentGif}
                  alt="reaction gif"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {open && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Ваша оценка</h3>

            {error && <div style={styles.error}>{error}</div>}

            {/* SCORE */}
            <div style={{
              ...styles.grid,
              transition: "outline 0.3s ease",
              outline: showErrorAnimation ? "2px solid #ff6b6b" : "none",
              borderRadius: 10,
              padding: showErrorAnimation ? "4px" : "0"
            }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setScore(i + 1);
                    setShowErrorAnimation(false);
                  }}
                  style={{
                    ...styles.box,
                    background: score === i + 1 ? "#4f7cff" : "#16213a",
                    borderColor: showErrorAnimation ? "#ff6b6b" : "#24324f"
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* COMMENT */}
            <textarea
              placeholder="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={styles.textarea}
            />

            {/* GIF SEARCH */}
            {ENABLE_GIFS &&
              <div style={styles.gifSection}>
                <div style={styles.gifTitle}>GIF</div>

                <div style={styles.gifSearchRow}>
                  <input
                    placeholder="Поиск GIF..."
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    style={styles.gifInput}
                  />

                  <button
                    onClick={() => searchGifs(gifSearch)}
                    style={styles.gifBtn}
                  >
                    Найти
                  </button>
                </div>

                {loadingGifs && (
                  <div style={styles.loading}>Загрузка...</div>
                )}

                <div style={styles.gifGrid}>
                  {gifs.map((gif) => (
                    <img
                      key={gif.id}
                      src={gif.url}
                      onClick={() => setSelectedGif(gif.url)}
                      style={{
                        ...styles.gifImage,
                        border:
                          selectedGif === gif.url
                            ? "2px solid #4f7cff"
                            : "2px solid transparent",
                      }}
                    />
                  ))}
                </div>

                {selectedGif && (
                  <img
                    src={selectedGif}
                    style={styles.selectedGif}
                  />
                )}
              </div>
            }

            {/* ACTIONS */}
            <div style={styles.actions}>
              <button
                onClick={() => {
                  setOpen(false);
                  setShowErrorAnimation(false);
                }}
                style={styles.cancel}
              >
                Отмена
              </button>

              <button onClick={submit} style={styles.submit}>
                Отправить
              </button>
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
    padding: 18,
    borderRadius: 16,
    color: "#e6edf7",
    border: "1px solid #1f2a44",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 18,
    fontWeight: 600,
  },

  number: {
    color: "#94a3b8",
    fontWeight: 700,
  },

  country: {
    fontSize: 18,
    fontWeight: 700,
  },

  total: {
    marginLeft: 10,
    fontWeight: 700,
    color: "#ffd166",
  },

  rateBtn: {
    padding: "8px 14px",
    background: "#4f7cff",
    color: "white",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },

  thumbnailWrapper: {
    position: "relative",
    marginTop: 10,
    width: "fit-content",
  },

  thumbnail: {
    display: "block",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #24324f",
  },

  thumbnailImg: {
    width: 120,
    height: 68,
    objectFit: "cover",
    borderRadius: 10,
    display: "block",
  },

  youtubeOverlay: {
    position: "absolute",
    right: 6,
    bottom: 6,
    padding: "4px 8px",
    background: "rgba(255,0,51,0.9)",
    color: "white",
    borderRadius: 8,
    fontSize: 9,
    fontWeight: 700,
    textDecoration: "none",
    transform: "translate(30%, 60%)",
  },

  artist: {
    marginTop: 10,
    color: "#9fb0d0",
    fontSize: 15,
  },

  scores: {
    marginTop: 14,
    display: "grid",
    gap: 10,
  },

  noScores: {
    color: "#64748b",
    fontSize: 13,
  },

  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 10,
    background: "#111a2e",
    borderRadius: 12,
    border: "1px solid #1f2a44",
  },

  user: {
    fontWeight: 600,
    color: "#e6edf7",
  },

  score: {
    fontWeight: 800,
    color: "#4f7cff",
    fontSize: 16,
    marginLeft: 6,
  },

  comment: {
    color: "#94a3b8",
    fontStyle: "italic",
    fontSize: 13,
  },

  commentGif: {
    width: 90,
    height: 60,
    objectFit: "contain",
    borderRadius: 8,
    marginLeft: 12,
  },

  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  modalContent: {
    background: "#0f172a",
    padding: 22,
    borderRadius: 16,
    width: 420,
    border: "1px solid #1f2a44",
    maxHeight: "90vh",
    overflowY: "auto",
  },

  scoreLeft: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    gap: 4,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 20,
    marginBottom: 10,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 10,
    marginTop: 12,
  },

  box: {
    padding: 14,
    borderRadius: 10,
    border: "1px solid #24324f",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 16,
    transition: "border-color 0.3s ease",
  },

  textarea: {
    width: "100%",
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: "#111a2e",
    border: "1px solid #24324f",
    color: "#fff",
    fontSize: 14,
    resize: "vertical",
  },

  gifSection: {
    marginTop: 16,
  },

  gifTitle: {
    marginBottom: 8,
    fontWeight: 700,
    color: "#fff",
  },

  gifSearchRow: {
    display: "flex",
    gap: 8,
  },

  gifInput: {
    flex: 1,
    background: "#111a2e",
    border: "1px solid #24324f",
    borderRadius: 10,
    padding: "10px 12px",
    color: "#fff",
  },

  gifBtn: {
    background: "#4f7cff",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },

  gifGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    maxHeight: 220,
    overflowY: "auto",
  },

  gifImage: {
    width: "100%",
    height: 90,
    objectFit: "cover",
    borderRadius: 10,
    cursor: "pointer",
  },

  selectedGif: {
    marginTop: 12,
    width: "100%",
    borderRadius: 12,
  },

  loading: {
    marginTop: 10,
    color: "#94a3b8",
  },

  actions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 16,
  },

  cancel: {
    background: "transparent",
    color: "#9fb0d0",
    border: "none",
    cursor: "pointer",
  },

  submit: {
    background: "#4f7cff",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },

  error: {
    color: "#ff6b6b",
    marginBottom: 10,
    fontSize: 14,
  },

  usernameLink: {
    color: "#e6edf7",
    fontWeight: 600,
    textDecoration: "none",
    padding: "2px 0",
    borderBottom: "1px solid transparent",
    transition: "all 0.15s ease",
    cursor: "pointer",
  },
};