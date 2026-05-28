import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { PerformanceWithScores, Theme } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import {
  getScoreButtonBackground,
  getScoreColor,
  SCORE_TWELVE,
} from "../utils/scoreUtils";
import { ScoreTwelveCelebration } from "./ScoreTwelveCelebration";

type GifItem = {
  id: string;
  title?: string;
  url: string;
};

type Props = {
  performance: PerformanceWithScores;
  theme: Theme;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialScore?: number | null;
  initialComment?: string;
  initialGifUrl?: string | null;
};

const ENABLE_GIFS = true;
const SCORES_1_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function RatePerformanceModal({
  performance,
  theme,
  open,
  onClose,
  onSuccess,
  initialScore = null,
  initialComment = "",
  initialGifUrl = null,
}: Props) {
  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL || "";
  const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY || "";

  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(initialScore);
  const [comment, setComment] = useState(initialComment);
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [selectedGif, setSelectedGif] = useState<string | null>(initialGifUrl);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTwelveCelebration, setShowTwelveCelebration] = useState(false);

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  const modalOverlayBg = isLight ? "rgba(0, 0, 0, 0.4)" : "rgba(2, 6, 23, 0.9)";
  const modalPaperBg = isLight ? "#ffffff" : isGray ? "#1c1c1c" : "#0f172a";
  const modalPaperBorder = isLight ? "1px solid #cbd5e1" : isGray ? "1px solid #374151" : "1px solid #334155";
  const modalHeadingColor = isLight ? "#0f172a" : "#fff";
  const modalSubColor = isLight ? "#64748b" : "#94a3b8";
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();

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

  useEffect(() => {
    if (!open) return;
    setScore(initialScore ?? null);
    setComment(initialComment);
    setSelectedGif(initialGifUrl);
    setGifSearch("");
    setError(null);
    setShowErrorAnimation(false);
    setShowTwelveCelebration(false);
    void loadLocalGifs();
  }, [open, performance.performance_id, initialScore, initialComment, initialGifUrl]);

  async function loadLocalGifs() {
    try {
      setLoadingGifs(true);
      const res = await fetch("/gifs.json");
      if (res.ok) {
        const data = await res.json();
        const normalized: GifItem[] = (data || []).map((g: { id: string; title?: string; image: string }) => ({
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
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=50&rating=pg`
      );
      const data = await res.json();
      const normalized: GifItem[] = (data.data || []).map((g: {
        id: string;
        title: string;
        images?: { fixed_height_small?: { url?: string }; original?: { url?: string } };
      }) => ({
        id: g.id,
        title: g.title,
        url: g.images?.fixed_height_small?.url || g.images?.original?.url || "",
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
      if (currentScore === SCORE_TWELVE) {
        setShowTwelveCelebration(true);
        await new Promise((r) => setTimeout(r, 2400));
      }
      onClose();
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
      setShowTwelveCelebration(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div style={{ ...modalStyles.modal, background: modalOverlayBg }}>
      <div
        style={{
          ...modalStyles.modalPaper,
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
        }}
      >
        <button
          type="button"
          onClick={onClose}
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

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: isLight
              ? "linear-gradient(135deg, rgba(55, 65, 81, 0.15), rgba(75, 85, 99, 0.15))"
              : isGray
                ? "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))"
                : "linear-gradient(135deg, rgba(79, 124, 255, 0.2), rgba(124, 77, 255, 0.2))",
            border: isLight
              ? "1px solid rgba(55, 65, 81, 0.2)"
              : isGray
                ? "1px solid rgba(255, 255, 255, 0.1)"
                : "1px solid rgba(79, 124, 255, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            boxShadow: isLight
              ? "0 4px 16px rgba(55, 65, 81, 0.1)"
              : "0 4px 16px rgba(79, 124, 255, 0.15)",
            fontSize: 22,
          }}
        >
          ⭐
        </div>

        <h2
          style={{
            margin: "0 0 4px 0",
            fontSize: 20,
            fontWeight: 900,
            color: modalHeadingColor,
            textAlign: "center",
            letterSpacing: "-0.02em",
          }}
        >
          Оценка выступления
        </h2>

        <p
          style={{
            margin: "0 0 8px 0",
            fontSize: 13,
            color: modalSubColor,
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: 360,
          }}
        >
          {supportsEmoji && (
            <span style={{ fontSize: 18, marginRight: 6 }}>{performance.country.flag_emoji}</span>
          )}
          <span style={{ fontWeight: 700, color: modalHeadingColor }}>
            {performance.country.name_ru}
          </span>
          {" · "}
          {performance.artist} — {performance.song}
        </p>

        <p
          style={{
            margin: "0 0 16px 0",
            color: modalSubColor,
            fontSize: 13,
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: 360,
          }}
        >
          Оцените от 1 до 10 или поставьте легендарные 12 баллов
        </p>

        {error && <div style={modalStyles.errorBanner}>{error}</div>}

        <ScoreTwelveCelebration active={showTwelveCelebration} />

        <div style={{ width: "100%", marginBottom: 12, opacity: showTwelveCelebration ? 0.15 : 1, transition: "opacity 0.3s" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: 4,
              marginBottom: 10,
            }}
          >
            {SCORES_1_10.map((n) => {
              const active = score === n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={showTwelveCelebration || submitting}
                  onClick={() => {
                    setScore(n);
                    setShowErrorAnimation(false);
                  }}
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: 10,
                    background: active ? getScoreColor(n) : ratingBtnInactiveBg,
                    color: active ? "#fff" : ratingBtnInactiveText,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: "pointer",
                    transform: active ? "scale(1.12)" : "scale(1)",
                    border:
                      active
                        ? "2px solid #fff"
                        : showErrorAnimation
                          ? "2px solid #ff6b6b"
                          : `1px solid ${ratingBtnInactiveBorder}`,
                    transition: "all 0.2s ease",
                    padding: 0,
                    boxShadow: active
                      ? `0 4px 12px ${getScoreColor(n)}`
                      : showErrorAnimation
                        ? "0 0 10px rgba(255, 107, 107, 0.5)"
                        : "none",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={showTwelveCelebration || submitting}
            onClick={() => {
              setScore(SCORE_TWELVE);
              setShowErrorAnimation(false);
            }}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: 14,
              border:
                score === SCORE_TWELVE
                  ? "2px solid #fff"
                  : showErrorAnimation
                    ? "2px solid #ff6b6b"
                    : `2px solid ${isLight ? "rgba(234, 179, 8, 0.5)" : "rgba(250, 204, 21, 0.45)"}`,
              background:
                score === SCORE_TWELVE
                  ? getScoreButtonBackground(SCORE_TWELVE, true)
                  : isLight
                    ? "linear-gradient(135deg, rgba(254, 240, 138, 0.35), rgba(251, 207, 232, 0.25))"
                    : "linear-gradient(135deg, rgba(250, 204, 21, 0.15), rgba(236, 72, 153, 0.12))",
              color: score === SCORE_TWELVE ? "#fff" : isLight ? "#92400e" : "#fde047",
              fontSize: 22,
              fontWeight: 1000,
              letterSpacing: "0.06em",
              cursor: "pointer",
              transform: score === SCORE_TWELVE ? "scale(1.02)" : "scale(1)",
              boxShadow:
                score === SCORE_TWELVE
                  ? "0 8px 32px rgba(250, 204, 21, 0.55), 0 0 40px rgba(236, 72, 153, 0.35)"
                  : "0 4px 16px rgba(250, 204, 21, 0.15)",
              transition: "all 0.25s ease",
              animation: score === SCORE_TWELVE ? "ev-12-btn-glow 1.2s ease-in-out infinite alternate" : "none",
            }}
          >
            ✨ 12 — Douze points!
          </button>
          <style>{`
            @keyframes ev-12-btn-glow {
              from { filter: brightness(1); }
              to { filter: brightness(1.15); }
            }
          `}</style>
        </div>

        <textarea
          placeholder="Твой комментарий (необязательно)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{
            ...modalStyles.modalTextarea,
            background: textareaBg,
            border: textareaBorder,
            color: textareaColor,
            minHeight: 60,
            marginBottom: 12,
            padding: 12,
            fontSize: 16,
          }}
        />

        {ENABLE_GIFS && (
          <div
            style={{
              ...modalStyles.gifPicker,
              background: gifPickerBg,
              width: "100%",
              padding: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ ...modalStyles.gifSearchBox, marginBottom: 8 }}>
              <input
                placeholder="Найди гифку для реакции..."
                value={gifSearch}
                onChange={(e) => setGifSearch(e.target.value)}
                style={{
                  ...modalStyles.gifSearchInput,
                  color: gifSearchColor,
                  borderBottom: gifSearchBorder,
                  padding: 6,
                  fontSize: 16,
                }}
              />
              <button
                type="button"
                onClick={() => searchGifs(gifSearch)}
                style={{ ...modalStyles.gifSearchBtn, fontSize: 16 }}
              >
                🔍
              </button>
            </div>
            <div style={{ ...modalStyles.gifScroll, paddingBottom: 4 }}>
              {loadingGifs && (
                <div
                  style={{
                    textAlign: "center",
                    padding: 8,
                    color: gifSearchColor,
                    width: "100%",
                    fontSize: 13,
                  }}
                >
                  Ищем...
                </div>
              )}
              {gifs.map((gif) => (
                <img
                  key={gif.id}
                  src={gif.url}
                  alt=""
                  onClick={() => setSelectedGif(gif.url)}
                  style={{
                    ...modalStyles.gifThumb,
                    height: 48,
                    border:
                      selectedGif === gif.url
                        ? `3px solid ${isLight ? "#374151" : "#4f7cff"}`
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ ...modalStyles.modalFooter, width: "100%" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...modalStyles.btnSecondary,
              background: btnSecBg,
              color: btnSecColor,
              border: btnSecBorder,
              padding: "10px 0",
            }}
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={submit}
            style={{
              ...modalStyles.btnPrimary,
              padding: "10px 0",
              background: isLight
                ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)"
                : isGray
                  ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)"
                  : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
              boxShadow: isLight
                ? "0 8px 24px rgba(31, 41, 55, 0.25)"
                : isGray
                  ? "0 8px 24px rgba(0, 0, 0, 0.4)"
                  : "0 8px 24px rgba(79, 124, 255, 0.35)",
            }}
          >
            Подтвердить
          </button>
        </div>

        {submitting && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                border: "4px solid rgba(255,255,255,0.2)",
                borderTopColor: isLight ? "#1f2937" : "#4f7cff",
                borderRadius: "50%",
                animation: "ev-rate-spin 0.8s linear infinite",
              }}
            />
            <style>{`
              @keyframes ev-rate-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

const modalStyles: Record<string, CSSProperties> = {
  modal: {
    position: "fixed",
    inset: 0,
    backdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: 10,
  },
  modalPaper: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 24,
    maxHeight: "95vh",
    overflowY: "auto",
    boxSizing: "border-box",
  },
  modalTextarea: {
    width: "100%",
    borderRadius: 16,
    minHeight: 80,
    boxSizing: "border-box",
    outline: "none",
  },
  gifPicker: { borderRadius: 16, boxSizing: "border-box" },
  gifSearchBox: { display: "flex", gap: 8 },
  gifSearchInput: { flex: 1, background: "transparent", border: "none", outline: "none" },
  gifSearchBtn: { background: "none", border: "none", cursor: "pointer" },
  gifScroll: { display: "flex", gap: 10, overflowX: "auto" },
  gifThumb: { borderRadius: 8, cursor: "pointer", flexShrink: 0 },
  modalFooter: { display: "flex", gap: 12 },
  btnSecondary: {
    flex: 1,
    borderRadius: 14,
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 12,
  },
  btnPrimary: {
    flex: 2,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12,
  },
  errorBanner: {
    background: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 14,
    textAlign: "center",
    width: "100%",
  },
};
