import type { Theme } from "../../types/contest";
import type { GameContestScore } from "../../types/game";
import { contestTypeLabel } from "../../utils/contestLabels";
import { getScoreColor } from "../../utils/scoreUtils";
import { FavoriteButton } from "../FavoriteButton";
import { isCatalogPerformanceId } from "../../utils/gamePlaylist";
import {
  GameContestScoresFeed,
  GameRevealOutcomeBadge,
  formatRevealAvg,
  computeRevealAvg,
} from "./GameContestScoresFeed";

type RoundInfo = {
  performance_id?: string;
  artist?: string;
  song?: string;
  country_name?: string;
  flag_emoji?: string;
  year?: number;
  contest_type?: string;
  contest_scores?: GameContestScore[];
  total_score?: number;
  qualified?: boolean;
  place?: number;
};

type Props = {
  round: RoundInfo;
  theme: Theme;
  supportsEmoji: boolean;
  variant?: "reveal" | "hint";
};

export function GameRevealAnswerCard({ round, theme, supportsEmoji, variant = "reveal" }: Props) {
  const isHint = variant === "hint";
  const scores = isHint ? [] : (round.contest_scores ?? []);
  const avg = isHint ? null : computeRevealAvg(scores, round.total_score);
  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const gradEnd = isLight ? "#f1f5f9" : isGray ? "#121212" : "#0f172a";
  const avgColor = avg != null ? getScoreColor(avg) : null;

  const hasOutcome =
    !isHint &&
    ((round.contest_type?.includes("semifinal") && round.qualified != null) ||
      (!round.contest_type?.includes("semifinal") && round.place != null && round.place > 0));

  const showFavorite = !isHint && isCatalogPerformanceId(round.performance_id);

  return (
    <div className={`gts-reveal-card${isHint ? " gts-reveal-card--hint" : ""}`}>
      <div className={`gts-reveal-card__hero${avg == null ? " gts-reveal-card__hero--no-score" : ""}`}>
        <div className="gts-reveal-card__head">
          <div className="gts-reveal-card__identity">
            <span className="gts-reveal-card__flag">
              {supportsEmoji && round.flag_emoji ? round.flag_emoji : "🎤"}
            </span>
            {round.year ? <span className="gts-reveal-card__year">{round.year}</span> : null}
          </div>
          <div className="gts-reveal-card__badges">
            {round.contest_type ? (
              <span className="gts-reveal-card__type">{contestTypeLabel(round.contest_type)}</span>
            ) : null}
            {hasOutcome ? (
              <GameRevealOutcomeBadge
                contestType={round.contest_type}
                qualified={round.qualified}
                place={round.place}
                theme={theme}
              />
            ) : null}
          </div>
        </div>

        <div className="gts-reveal-card__main">
          {round.country_name ? <p className="gts-reveal-card__country">{round.country_name}</p> : null}
          {round.artist ? <p className="gts-reveal-card__artist">{round.artist}</p> : null}
          {round.song ? <p className="gts-reveal-card__song">{round.song}</p> : null}
        </div>

        {avg != null && avgColor ? (
          <div
            className="gts-reveal-card__score"
            style={{ background: `linear-gradient(160deg, ${avgColor} 0%, ${gradEnd} 140%)` }}
          >
            <span className="gts-reveal-card__score-label">Балл</span>
            <span className="gts-reveal-card__score-value">{formatRevealAvg(avg)}</span>
          </div>
        ) : null}
      </div>

      {showFavorite ? (
        <div className="gts-reveal-card__actions">
          <FavoriteButton
            performanceId={round.performance_id}
            size={16}
            theme={theme}
            variant="bar"
            titleAdd="Добавить в избранное"
            titleRemove="Убрать из избранного"
            className="gts-reveal-card__favorite"
          />
        </div>
      ) : null}

      {!isHint && scores.length > 0 ? (
        <div className="gts-reveal-card__scores">
          <GameContestScoresFeed
            scores={scores}
            theme={theme}
            compact
            embedded
            showSummary={false}
            totalScore={round.total_score}
            contestType={round.contest_type}
            qualified={round.qualified}
            place={round.place}
          />
        </div>
      ) : null}
    </div>
  );
}
