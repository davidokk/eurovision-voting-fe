import { useState, type ReactNode } from "react";
import type { PerformanceWithScores, ScoreView, Theme } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { RatePerformanceModal } from "./RatePerformanceModal";
import { ScoreTwelveDisplay } from "./ScoreTwelveDisplay";
import { getScoreColor, isScoreTwelve } from "../utils/scoreUtils";
import { FavoriteButton } from "./FavoriteButton";
import { GifPreview } from "./GifPreview";
import "./PerformanceCardV2.css";

type Props = {
  performance: PerformanceWithScores;
  votingStarted: boolean;
  votingEnded: boolean;
  theme?: Theme;
  contestType?: string;
  onRated?: () => void | Promise<void>;
  /** Первое выступление без оценки текущего пользователя (очередь голосования) */
  awaitingRating?: boolean;
};

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com.*v=)([^&?/]+)/i);
  return match?.[1] || null;
}

export function PerformanceCardV2({
  performance,
  votingStarted,
  votingEnded,
  theme = "dark-blue",
  contestType,
  onRated,
  awaitingRating = false,
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
  const formatScore = (num: number) => Number(num.toFixed(2));

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  const youtubeId = performance.youtube_link ? getYouTubeId(performance.youtube_link) : null;
  const avgColor = getScoreColor(performance.total_score);

  const placeWords: Record<number, string> = {
    1: "Первое место",
    2: "Второе место",
    3: "Третье место",
  };

  const isSemifinal = contestType?.includes("semifinal");
  const hasPlace = performance.place !== undefined && performance.place !== null;
  const hasTwelveOnCard = performance.scores.some((s) => isScoreTwelve(s.score));
  const canRate = Boolean(token && votingStarted && !votingEnded);
  const showAwaiting = awaitingRating && votingStarted && !votingEnded;

  const palette = isLight
    ? {
        cardBg: "linear-gradient(165deg, #f7f9fc 0%, #eef2f7 52%, #e4ebf3 100%)",
        cardBorder: "1px solid #c5d0de",
        text: "#0f1a2a",
        muted: "#5a6b80",
        soft: "rgba(15, 26, 42, 0.05)",
        softBorder: "1px solid rgba(15, 26, 42, 0.1)",
        accent: "#0d7377",
        accentSoft: "rgba(13, 115, 119, 0.1)",
        mediaScrim: "linear-gradient(to top, rgba(15,26,42,0.75) 0%, transparent 50%)",
        rateBg: "#0f1a2a",
        rateFg: "#f7f9fc",
        feedBg: "rgba(255,255,255,0.65)",
        feedMeBg: "rgba(13, 115, 119, 0.08)",
        feedMeBorder: "1px solid rgba(13, 115, 119, 0.28)",
        empty: "#7a8a9e",
        metaBg: "rgba(255,255,255,0.7)",
        scoreGradEnd: "#f1f5f9",
        scoreLabel: "rgba(0,0,0,0.55)",
        scoreValue: "#0f1a2a",
      }
    : isGray
    ? {
        cardBg: "linear-gradient(165deg, #1c1c1c 0%, #141414 55%, #0e0e0e 100%)",
        cardBorder: "1px solid #2e2e2e",
        text: "#f3f0ea",
        muted: "#a39e94",
        soft: "rgba(255,255,255,0.04)",
        softBorder: "1px solid rgba(255,255,255,0.08)",
        accent: "#e8b931",
        accentSoft: "rgba(232, 185, 49, 0.14)",
        mediaScrim: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)",
        rateBg: "#e8b931",
        rateFg: "#121212",
        feedBg: "rgba(0,0,0,0.35)",
        feedMeBg: "rgba(232, 185, 49, 0.1)",
        feedMeBorder: "1px solid rgba(232, 185, 49, 0.32)",
        empty: "#6b6b6b",
        metaBg: "rgba(255,255,255,0.04)",
        scoreGradEnd: "#121212",
        scoreLabel: "rgba(255,255,255,0.7)",
        scoreValue: "#fff",
      }
    : {
        cardBg: "linear-gradient(165deg, #12203a 0%, #0b1528 50%, #08101c 100%)",
        cardBorder: "1px solid #1e2d4a",
        text: "#eef2f7",
        muted: "#8fa0b8",
        soft: "rgba(255,255,255,0.04)",
        softBorder: "1px solid rgba(255,255,255,0.08)",
        accent: "#e8b931",
        accentSoft: "rgba(232, 185, 49, 0.14)",
        mediaScrim: "linear-gradient(to top, rgba(8,16,28,0.85) 0%, transparent 50%)",
        rateBg: "#e8b931",
        rateFg: "#0b1528",
        feedBg: "rgba(0,0,0,0.28)",
        feedMeBg: "rgba(232, 185, 49, 0.1)",
        feedMeBorder: "1px solid rgba(232, 185, 49, 0.35)",
        empty: "#5a6a80",
        metaBg: "rgba(255,255,255,0.04)",
        scoreGradEnd: "#0b1528",
        scoreLabel: "rgba(255,255,255,0.7)",
        scoreValue: "#fff",
      };

  const placeBadge: ReactNode =
    !isSemifinal && hasPlace ? (
      <span
        key="place"
        className="pcv2__place"
        style={
          performance.place! === 1
            ? { background: "#facc15", color: "#000", borderColor: "#000" }
            : performance.place! === 2
            ? { background: "#94a3b8", color: "#fff", borderColor: "#000" }
            : performance.place! === 3
            ? { background: "#d97706", color: "#fff", borderColor: "#000" }
            : {
                background: isLight ? "#0f1a2a" : palette.accent,
                color: isLight ? "#fff" : "#0b1528",
                borderColor: "#000",
              }
        }
      >
        {performance.place! <= 3
          ? placeWords[performance.place!]
          : `${performance.place} место`}
      </span>
    ) : null;

  const otherBadges: ReactNode[] = [];

  if (isSemifinal) {
    otherBadges.push(
      <span
        key="qual"
        className="pcv2__status"
        style={
          performance.qualified
            ? {
                background: "rgba(34, 197, 94, 0.15)",
                color: isLight ? "#166534" : "#4ade80",
                border: "1px solid rgba(34, 197, 94, 0.35)",
              }
            : {
                background: "rgba(239, 68, 68, 0.15)",
                color: isLight ? "#991b1b" : "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.35)",
              }
        }
      >
        {performance.qualified ? "В финале" : "Не прошла"}
      </span>
    );
  }

  if (showAwaiting) {
    otherBadges.push(
      <span
        key="await"
        className="pcv2__status pcv2__status--pulse"
        style={{
          background: isLight ? "rgba(245, 158, 11, 0.18)" : "rgba(255, 209, 102, 0.18)",
          color: isLight ? "#b45309" : "#ffd166",
          border: isLight
            ? "1px solid rgba(245, 158, 11, 0.35)"
            : "1px solid rgba(255, 209, 102, 0.4)",
        }}
      >
        Ожидает оценки
      </span>
    );
  }

  return (
    <article
      className={`pcv2${hasTwelveOnCard ? " ev-score-12-card" : ""}`}
      style={{
        background: palette.cardBg,
        border: palette.cardBorder,
        color: palette.text,
      }}
    >
      {/* Media — number overlay + play */}
      <div className="pcv2__media">
        {youtubeId ? (
          <a
            href={performance.youtube_link}
            target="_blank"
            rel="noreferrer"
            className="pcv2__media-link"
          >
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
              alt=""
              className="pcv2__media-img"
            />
            <div className="pcv2__media-scrim" style={{ background: palette.mediaScrim }} />
            <span className="pcv2__play" aria-hidden>
              ▶
            </span>
          </a>
        ) : (
          <div className="pcv2__media-fallback" style={{ background: palette.soft }} />
        )}

        <span className="pcv2__ord">
          #{String(performance.number).padStart(2, "0")}
        </span>
      </div>

      <div className="pcv2__body">
        {/* Meta: country · place · fav */}
        <div
          className="pcv2__meta"
          style={{ background: palette.metaBg, border: palette.softBorder }}
        >
          <div className="pcv2__country-row">
            {supportsEmoji && (
              <span className="pcv2__flag" aria-hidden>
                {performance.country.flag_emoji}
              </span>
            )}
            <a
              href={`/country/${performance.country.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pcv2__country"
              style={{ color: palette.text }}
            >
              {performance.country.name_ru}
            </a>
            {placeBadge}
          </div>

          {token && (
            <div className="pcv2__fav">
              <FavoriteButton performanceId={performance.performance_id} size={16} theme={theme} />
            </div>
          )}
        </div>

        {/* Track */}
        <div className="pcv2__track">
          <h3 className="pcv2__artist">{performance.artist}</h3>
          <p className="pcv2__song" style={{ color: palette.muted }}>
            {performance.song}
          </p>
        </div>

        {/* Other statuses + rate */}
        {(otherBadges.length > 0 || canRate) && (
          <div className="pcv2__toolbar">
            <div className="pcv2__statuses">{otherBadges}</div>
            {canRate && (
              <button
                type="button"
                className="pcv2__rate"
                style={{ background: palette.rateBg, color: palette.rateFg }}
                onClick={() => setOpen(true)}
              >
                Оценить
              </button>
            )}
          </div>
        )}

        {/* Average score — own prominent block */}
        <div
          className="pcv2__avg"
          style={{
            background: `linear-gradient(135deg, ${avgColor} 0%, ${palette.scoreGradEnd} 140%)`,
            border: palette.softBorder,
          }}
        >
          <div className="pcv2__avg-text">
            <span className="pcv2__avg-label" style={{ color: palette.scoreLabel }}>
              Средний балл
            </span>
            <span className="pcv2__avg-hint" style={{ color: palette.muted }}>
              по оценкам жюри
            </span>
          </div>
          <span className="pcv2__avg-value" style={{ color: palette.scoreValue }}>
            {formatScore(performance.total_score)}
          </span>
        </div>

        {/* Votes feed */}
        <div className="pcv2__feed" style={{ background: palette.feedBg, border: palette.softBorder }}>
          {performance.scores.length === 0 ? (
            <div className="pcv2__empty" style={{ color: palette.empty }}>
              Пока никто не проголосовал
            </div>
          ) : (
            <ul className="pcv2__feed-list">
              {performance.scores.map((s, i) => {
                const isMe = s.username === myUsername;
                return (
                  <li
                    key={i}
                    className={`pcv2__feed-item${isMe ? " pcv2__feed-item--me" : ""}`}
                    style={
                      isMe
                        ? { background: palette.feedMeBg, border: palette.feedMeBorder }
                        : { borderBottom: palette.softBorder }
                    }
                  >
                    <div className="pcv2__feed-main">
                      <a
                        href={`/user/${s.user_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pcv2__feed-user"
                        style={{ color: isMe ? palette.accent : palette.text }}
                      >
                        {s.username}
                        {isMe ? " (вы)" : ""}
                      </a>
                      {s.comment && (
                        <p className="pcv2__feed-comment" style={{ color: palette.muted }}>
                          «{s.comment}»
                        </p>
                      )}
                    </div>

                    {s.gif_url && (
                      <div className="pcv2__feed-gif ev-gif-wrap">
                        <GifPreview src={s.gif_url} maxWidth={72} maxHeight={56} />
                      </div>
                    )}

                    <div className="pcv2__feed-score">
                      <ScoreTwelveDisplay
                        score={s.score}
                        variant="badge"
                        showEmoji
                        style={
                          !isScoreTwelve(s.score)
                            ? { fontSize: 14, fontWeight: 800, color: getScoreColor(s.score) }
                            : undefined
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
    </article>
  );
}
