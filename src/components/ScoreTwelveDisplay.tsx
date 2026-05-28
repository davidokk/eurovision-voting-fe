import type { CSSProperties, ReactNode } from "react";
import { getScoreColor, getScoreEmoji, isScoreTwelve, SCORE_TWELVE } from "../utils/scoreUtils";

export type ScoreTwelveVariant = "inline" | "badge" | "chat" | "cell";

type Props = {
  score: number;
  variant?: ScoreTwelveVariant;
  showEmoji?: boolean;
  suffix?: ReactNode;
  prefix?: ReactNode;
  style?: CSSProperties;
  className?: string;
};

export function ScoreTwelveDisplay({
  score,
  variant = "inline",
  showEmoji = false,
  suffix,
  prefix,
  style,
  className,
}: Props) {
  if (!isScoreTwelve(score)) {
    return (
      <span
        className={className}
        style={{ fontWeight: 800, color: getScoreColor(score), ...style }}
      >
        {prefix}
        {showEmoji && <span style={{ marginRight: 4 }}>{getScoreEmoji(score)}</span>}
        {score}
        {suffix}
      </span>
    );
  }

  return (
    <span
      className={["ev-score-12", `ev-score-12--${variant}`, className].filter(Boolean).join(" ")}
      style={style}
      title="Douze points!"
    >
      {prefix}
      {showEmoji && <span className="ev-score-12-emoji">{getScoreEmoji(score)}</span>}
      {SCORE_TWELVE}
      {suffix}
    </span>
  );
}
