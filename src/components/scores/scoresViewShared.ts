import type { PerformanceWithScores, ScoreView, Theme } from "../../types/contest";

export type ScoresViewMode = "cards" | "table" | "leaderboard" | "heatmap" | "order";

export type ScoresViewProps = {
  performances: PerformanceWithScores[];
  theme?: Theme;
  contestType?: string;
  votingStarted: boolean;
  votingEnded: boolean;
  isAuthenticated: boolean;
  onRated?: () => void;
};

export function getScoreColor(score: number) {
  const hue = ((score - 1) * 120) / 9;
  return `hsl(${hue}, 80%, 45%)`;
}

/** Приглушённая заливка ячейки heatmap (фон + цвет текста) */
export function heatCellStyles(
  score: number | null | undefined,
  isLight: boolean,
  emptyBg?: string
): { background: string; color: string } {
  if (score == null || score === undefined) {
    return {
      background: emptyBg ?? (isLight ? "#f8fafc" : "#1a2332"),
      color: isLight ? "#94a3b8" : "#64748b",
    };
  }
  const hue = ((score - 1) * 120) / 9;

  if (isLight) {
    // Светлая тема: насыщеннее фон, темнее текст — иначе всё сливается в серый
    const sat = 58;
    const lit = 74;
    return {
      background: `hsla(${hue}, ${sat}%, ${lit}%, 1)`,
      color: `hsl(${hue}, 72%, 22%)`,
    };
  }

  return {
    background: `hsla(${hue}, 28%, 28%, 1)`,
    color: `hsl(${hue}, 42%, 74%)`,
  };
}

export function formatAvg(n: number | null) {
  if (n == null) return "—";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export function formatTotal(n: number) {
  return Number(n.toFixed(2));
}

export function readScoresAuth() {
  return {
    token: localStorage.getItem("token"),
    myUsername: localStorage.getItem("username"),
    myUserId: localStorage.getItem("user_id"),
  };
}

export function myScoreFor(
  p: PerformanceWithScores,
  opts: { isLoggedIn: boolean; myUserId: string | null; myUsername: string | null }
): ScoreView | undefined {
  const { isLoggedIn, myUserId, myUsername } = opts;
  if (!isLoggedIn || !myUserId) return undefined;
  return p.scores.find(
    (s) => s.user_id === myUserId || (myUsername && s.username === myUsername)
  );
}

export function getScoresViewColors(theme: Theme) {
  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  return {
    isLight,
    isGray,
    wrapBg: isLight ? "rgba(255,255,255,0.85)" : isGray ? "rgba(30,30,30,0.9)" : "rgba(15,23,42,0.85)",
    wrapBorder: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)",
    headBg: isLight ? "#f1f5f9" : isGray ? "#2a2a2a" : "#1e293b",
    headText: isLight ? "#475569" : "#94a3b8",
    cellBg: isLight ? "#fff" : isGray ? "#1a1a1a" : "#0f172a",
    cellAlt: isLight ? "#f8fafc" : isGray ? "#222" : "#111827",
    text: isLight ? "#0f172a" : "#e2e8f0",
    sub: isLight ? "#64748b" : "#94a3b8",
    accent: isLight ? "#4f7cff" : "#6b8cff",
    stickyBg: isLight ? "#f8fafc" : isGray ? "#252525" : "#172033",
    border: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
    btnBg: isLight ? "rgba(79,124,255,0.1)" : "rgba(79,124,255,0.18)",
    btnActive: isLight ? "rgba(79,124,255,0.22)" : "rgba(79,124,255,0.35)",
    empty: isLight ? "#94a3b8" : "#64748b",
    rateBtn: isLight
      ? "linear-gradient(135deg, #4b5563, #1f2937)"
      : isGray
        ? "linear-gradient(135deg, #6b7280, #374151)"
        : "linear-gradient(135deg, #4f7cff, #7c4dff)",
    myColBg: isLight ? "rgba(79,124,255,0.06)" : "rgba(79,124,255,0.1)",
    gold: isLight ? "#d97706" : "#ffd166",
    shadow: isLight
      ? "0 12px 40px rgba(0,0,0,0.06)"
      : "0 12px 40px rgba(0,0,0,0.35)",
    chipBg: isLight ? "#fff" : isGray ? "#252525" : "#1e293b",
    chipActive: isLight ? "rgba(79,124,255,0.15)" : "rgba(79,124,255,0.28)",
    chipBorder: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
    chipActiveBorder: "1px solid rgba(79,124,255,0.55)",
  };
}

export const PLACE_WORDS: Record<number, string> = {
  1: "1-е место",
  2: "2-е место",
  3: "3-е место",
};
