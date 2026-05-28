export const SCORE_TWELVE = 12;

export function isAllowedScore(score: number): boolean {
  return (score >= 1 && score <= 10) || score === SCORE_TWELVE;
}

export function isScoreTwelve(score: number): boolean {
  return score >= SCORE_TWELVE;
}

/** Сплошной цвет для кнопок, бейджей, текста */
export function getScoreColor(score: number): string {
  if (score >= SCORE_TWELVE) return "#eab308";
  const clamped = Math.min(10, Math.max(1, score));
  const hue = ((clamped - 1) * 120) / 9;
  return `hsl(${hue}, 80%, 45%)`;
}

export function getScoreButtonBackground(score: number, active: boolean): string {
  if (!active) return "";
  if (score >= SCORE_TWELVE) {
    return "linear-gradient(135deg, #fde047 0%, #f59e0b 35%, #ec4899 70%, #8b5cf6 100%)";
  }
  return getScoreColor(score);
}

export function getScoreEmoji(score: number): string {
  if (score >= SCORE_TWELVE) return "✨";
  if (score <= 3) return "💩";
  if (score <= 6) return "😕";
  if (score <= 7) return "🙂";
  if (score <= 9) return "🔥";
  return "😍";
}
