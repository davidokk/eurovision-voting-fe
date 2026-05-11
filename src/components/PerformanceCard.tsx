import { useState } from "react";
import type { PerformanceWithScores } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";

type Props = {
  performance: PerformanceWithScores;
  votingStarted: boolean;
  votingEnded: boolean;
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
  const token = localStorage.getItem("token");

  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  function getScoreEmoji(score: number) {
    if (score <= 3) return "💩";
    if (score <= 6) return "😕";
    if (score <= 7) return "🙂";
    if (score <= 9) return "🔥";
    return "😍";
  }

  const API_URL = import.meta.env.VITE_API_URL;
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();

  async function submit() {
    if (!token || score === null) return;

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

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {token && votingStarted && !votingEnded && (
            <button
              style={styles.rateBtn}
              onClick={() => setOpen(true)}
            >
              Оценить
            </button>
          )}
        </div>
      </div>

      {/* YOUTUBE PREVIEW */}
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

          {/* BUTTON OVER IMAGE */}
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

        {performance.scores.map((s, i) => (
          <div key={i} style={styles.scoreRow}>
            <div style={styles.user}>
              {s.username}
              <span style={styles.score}>
                {getScoreEmoji(s.score)} {s.score}
              </span>
            </div>

            {s.comment && (
              <div style={styles.comment}>"{s.comment}"</div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL */}
      {open && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Ваша оценка</h3>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.grid}>
              {Array.from({ length: 10 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setScore(i + 1)}
                  style={{
                    ...styles.box,
                    background:
                      score === i + 1 ? "#4f7cff" : "#16213a",
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={styles.textarea}
            />

            <div style={styles.actions}>
              <button
                onClick={() => setOpen(false)}
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

  /* WRAPPER IMPORTANT */
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
  background: "rgba(255, 0, 51, 0.9)",
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
    flexDirection: "column",
    gap: 6,
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
    whiteSpace: "nowrap",
  },

  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  modalContent: {
    background: "#0f172a",
    padding: 22,
    borderRadius: 16,
    width: 380,
    border: "1px solid #1f2a44",
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
  },

  actions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 14,
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
};