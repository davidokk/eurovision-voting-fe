import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { PerformanceWithScores, ScoreView, Theme } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { RatePerformanceModal } from "./RatePerformanceModal";

type Props = {
  performances: PerformanceWithScores[];
  theme?: Theme;
  contestType?: string;
  votingStarted: boolean;
  votingEnded: boolean;
  isAuthenticated: boolean;
  onRated?: () => void;
};

type SortKey =
  | { kind: "country" }
  | { kind: "avg" }
  | { kind: "user"; userId: string };

type SortDir = "asc" | "desc";

function sortKeysEqual(a: SortKey, b: SortKey) {
  if (a.kind !== b.kind) return false;
  if (a.kind === "user" && b.kind === "user") return a.userId === b.userId;
  return true;
}

type TableRow = {
  performance: PerformanceWithScores;
  cells: (ScoreView | undefined)[];
  avg: number | null;
};

type TooltipState = {
  score: number;
  comment?: string;
  left: number;
  top: number;
} | null;

function sortIndicator(active: boolean, dir: SortDir) {
  if (!active) return "⇅";
  return dir === "asc" ? "▲" : "▼";
}

function formatAvg(n: number | null) {
  if (n == null) return "—";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

const PLACE_WORDS: Record<number, string> = {
  1: "1-е место",
  2: "2-е место",
  3: "3-е место",
};

export function ScoresTableView({
  performances,
  theme = "dark-blue",
  contestType,
  votingStarted,
  votingEnded,
  isAuthenticated,
  onRated,
}: Props) {
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();
  const myUsername = localStorage.getItem("username");
  const myUserId = localStorage.getItem("user_id");
  const token = localStorage.getItem("token");

  /** null = порядок выступлений (performance.number) */
  const [activeSort, setActiveSort] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [rateTarget, setRateTarget] = useState<PerformanceWithScores | null>(null);

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const isLoggedIn = isAuthenticated && !!token;
  const canVote = isLoggedIn && votingStarted && !votingEnded;
  const showMyColumn = isLoggedIn;

  const tooltipTheme = {
    bg: isLight ? "#ffffff" : isGray ? "#262626" : "#1e293b",
    border: isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #404040" : "1px solid #475569",
    text: isLight ? "#0f172a" : "#e2e8f0",
    score: isLight ? "#d97706" : "#ffd166",
    comment: isLight ? "#64748b" : "#94a3b8",
    shadow: isLight
      ? "0 10px 28px rgba(0,0,0,0.12)"
      : "0 10px 28px rgba(0,0,0,0.45)",
  };

  const users = useMemo(() => {
    const map = new Map<string, { user_id: string; username: string }>();
    for (const p of performances) {
      for (const s of p.scores) {
        if (!map.has(s.user_id)) {
          map.set(s.user_id, { user_id: s.user_id, username: s.username });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.username.localeCompare(b.username, "ru")
    );
  }, [performances]);

  const rows: TableRow[] = useMemo(() => {
    return performances.map((p) => {
      const byUser = new Map(p.scores.map((s) => [s.user_id, s]));
      const cells = users.map((u) => byUser.get(u.user_id));
      const nums = cells.filter((c): c is ScoreView => !!c).map((c) => c.score);
      const avg =
        nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      return { performance: p, cells, avg };
    });
  }, [performances, users]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];

    if (activeSort === null) {
      copy.sort((a, b) => a.performance.number - b.performance.number);
      return copy;
    }

    const dirMul = sortDir === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      if (activeSort.kind === "country") {
        const cmp = a.performance.country.name_ru.localeCompare(
          b.performance.country.name_ru,
          "ru"
        );
        return cmp * dirMul;
      }

      if (activeSort.kind === "avg") {
        const va = a.avg ?? -Infinity;
        const vb = b.avg ?? -Infinity;
        return (va - vb) * dirMul;
      }

      const idx = users.findIndex((u) => u.user_id === activeSort.userId);
      const va = idx >= 0 ? a.cells[idx]?.score ?? -Infinity : -Infinity;
      const vb = idx >= 0 ? b.cells[idx]?.score ?? -Infinity : -Infinity;
      return (va - vb) * dirMul;
    });

    return copy;
  }, [rows, activeSort, sortDir, users]);

  function toggleSort(next: SortKey) {
    const same = activeSort !== null && sortKeysEqual(activeSort, next);

    if (!same) {
      setActiveSort(next);
      setSortDir(next.kind === "country" ? "asc" : "desc");
      return;
    }

    if (sortDir === "desc") {
      setActiveSort(null);
      setSortDir("asc");
    } else {
      setSortDir("desc");
    }
  }

  function showTooltipForCell(el: HTMLElement, cell: ScoreView) {
    const rect = el.getBoundingClientRect();
    setTooltip({
      score: cell.score,
      comment: cell.comment?.trim() || undefined,
      left: rect.left + rect.width / 2,
      top: rect.top,
    });
  }

  function myScoreFor(p: PerformanceWithScores): ScoreView | undefined {
    if (!isLoggedIn || !myUserId) return undefined;
    return p.scores.find(
      (s) => s.user_id === myUserId || (myUsername && s.username === myUsername)
    );
  }

  function openRateModal(p: PerformanceWithScores) {
    if (!canVote) return;
    setRateTarget(p);
  }

  const colors = {
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
  };

  if (performances.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: colors.empty }}>
        Нет выступлений
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        borderRadius: 16,
        border: colors.wrapBorder,
        background: colors.wrapBg,
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        boxShadow: isLight
          ? "0 12px 40px rgba(0,0,0,0.06)"
          : "0 12px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            minWidth: Math.max(480, 200 + users.length * 88 + (showMyColumn ? 96 : 0)),
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  ...styles.th,
                  background: colors.headBg,
                  color: colors.headText,
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  minWidth: 200,
                  textAlign: "left",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleSort({ kind: "country" })}
                  style={headerBtnStyle(activeSort?.kind === "country", colors)}
                  title="Сортировать по названию страны (ещё раз — сброс)"
                >
                  Страна {sortIndicator(activeSort?.kind === "country", sortDir)}
                </button>
              </th>
              <th
                style={{
                  ...styles.th,
                  background: colors.headBg,
                  color: colors.headText,
                  minWidth: 72,
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleSort({ kind: "avg" })}
                  style={headerBtnStyle(activeSort?.kind === "avg", colors)}
                  title="Сортировать по среднему (ещё раз — сброс)"
                >
                  Средний {sortIndicator(activeSort?.kind === "avg", sortDir)}
                </button>
              </th>
              {showMyColumn && (
                <th
                  style={{
                    ...styles.th,
                    background: colors.headBg,
                    color: colors.headText,
                    minWidth: 96,
                  }}
                >
                  Моя оценка
                </th>
              )}
              {users.map((u) => (
                <th
                  key={u.user_id}
                  style={{
                    ...styles.th,
                    background: colors.headBg,
                    color: colors.headText,
                    minWidth: 80,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort({ kind: "user", userId: u.user_id })}
                    style={headerBtnStyle(
                      activeSort?.kind === "user" && activeSort.userId === u.user_id,
                      colors
                    )}
                    title={`Сортировать по оценкам ${u.username} (ещё раз — сброс)`}
                  >
                    {u.username}{" "}
                    {sortIndicator(
                      activeSort?.kind === "user" && activeSort.userId === u.user_id,
                      sortDir
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, ri) => {
              const p = row.performance;
              const rowBg = ri % 2 === 0 ? colors.cellBg : colors.cellAlt;
              const mine = myScoreFor(p);
              const isMyUserCol = (uid: string) =>
                isLoggedIn &&
                (uid === myUserId ||
                  (!!myUsername &&
                    users.find((u) => u.user_id === uid)?.username === myUsername));
              return (
                <tr key={p.performance_id}>
                  <td
                    style={{
                      ...styles.td,
                      background: colors.stickyBg,
                      color: colors.text,
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      borderRight: `1px solid ${colors.border}`,
                    }}
                  >
                    <CountryTableCell
                      performance={p}
                      theme={theme}
                      contestType={contestType}
                      supportsEmoji={supportsEmoji}
                      textColor={colors.text}
                      subColor={colors.sub}
                    />
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      background: rowBg,
                      color: colors.accent,
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    {formatAvg(row.avg)}
                  </td>
                  {showMyColumn && (
                    <td
                      style={{
                        ...styles.td,
                        background: colors.myColBg,
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      {canVote ? (
                        mine ? (
                          <button
                            type="button"
                            onClick={() => openRateModal(p)}
                            title="Изменить оценку"
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              fontWeight: 800,
                              fontSize: 15,
                              color: isLight ? "#d97706" : "#ffd166",
                            }}
                          >
                            ⭐ {mine.score}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openRateModal(p)}
                            style={{
                              border: "none",
                              borderRadius: 8,
                              padding: "5px 10px",
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#fff",
                              cursor: "pointer",
                              background: colors.rateBtn,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Оценить
                          </button>
                        )
                      ) : mine ? (
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 15,
                            color: isLight ? "#d97706" : "#ffd166",
                          }}
                        >
                          ⭐ {mine.score}
                        </span>
                      ) : (
                        <span style={{ color: colors.empty }}>—</span>
                      )}
                    </td>
                  )}
                  {row.cells.map((cell, ci) => {
                    const uid = users[ci]?.user_id;
                    const highlight = uid && isMyUserCol(uid);
                    return (
                      <td
                        key={`${p.performance_id}-${uid}`}
                        style={{
                          ...styles.td,
                          background: highlight ? colors.myColBg : rowBg,
                          color: cell ? colors.text : colors.empty,
                          textAlign: "center",
                          fontWeight: cell ? 700 : 400,
                          cursor: cell ? "help" : "default",
                        }}
                        onMouseEnter={(e) => cell && showTooltipForCell(e.currentTarget, cell)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {cell ? cell.score : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div style={{ padding: 16, textAlign: "center", color: colors.sub, fontSize: 13 }}>
          Пока нет оценок зрителей
        </div>
      )}

      {tooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: tooltip.left,
              top: tooltip.top,
              transform: "translate(-50%, calc(-100% - 8px))",
              maxWidth: 300,
              padding: "10px 12px",
              borderRadius: 10,
              background: tooltipTheme.bg,
              border: tooltipTheme.border,
              boxShadow: tooltipTheme.shadow,
              pointerEvents: "none",
              zIndex: 10000,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: tooltipTheme.score,
                marginBottom: tooltip.comment ? 6 : 0,
              }}
            >
              ⭐ {tooltip.score}
            </div>
            {tooltip.comment ? (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: tooltipTheme.comment,
                  whiteSpace: "pre-wrap",
                }}
              >
                {tooltip.comment}
              </div>
            ) : null}
          </div>,
          document.body
        )}

      {rateTarget && (
        <RatePerformanceModal
          performance={rateTarget}
          theme={theme}
          open
          initialScore={myScoreFor(rateTarget)?.score ?? null}
          initialComment={myScoreFor(rateTarget)?.comment ?? ""}
          initialGifUrl={myScoreFor(rateTarget)?.gif_url ?? null}
          onClose={() => setRateTarget(null)}
          onSuccess={() => onRated?.()}
        />
      )}
    </div>
  );
}

function CountryTableCell({
  performance: p,
  theme,
  contestType,
  supportsEmoji,
  textColor,
  subColor,
}: {
  performance: PerformanceWithScores;
  theme: Theme;
  contestType?: string;
  supportsEmoji: boolean;
  textColor: string;
  subColor: string;
}) {
  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const isSemifinal = contestType?.includes("semifinal");
  const hasPlace = p.place !== undefined && p.place !== null && p.place > 0;

  const numberBadge: CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    padding: "2px 7px",
    borderRadius: 6,
    background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.1)",
    color: isLight ? "#475569" : "#cbd5e1",
    flexShrink: 0,
  };

  return (
    <div style={styles.countryCell}>
      {supportsEmoji && (
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{p.country.flag_emoji}</span>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <span style={numberBadge}>#{p.number}</span>

          {!isSemifinal && hasPlace && p.place != null && (
            <span style={placeBadgeStyle(p.place, isLight, isGray)}>
              {p.place <= 3 ? PLACE_WORDS[p.place] : `${p.place} место`}
            </span>
          )}

          {isSemifinal && (
            <span style={qualifiedBadgeStyle(p.qualified, isLight)}>
              {p.qualified ? "В финале" : "Не прошла"}
            </span>
          )}
        </div>

        <div style={{ fontWeight: 700, color: textColor, lineHeight: 1.25 }}>
          {p.country.name_ru}
        </div>
        <div style={{ fontSize: 11, color: subColor, marginTop: 2, lineHeight: 1.3 }}>
          {p.artist} — {p.song}
        </div>
      </div>
    </div>
  );
}

function placeBadgeStyle(place: number, isLight: boolean, isGray: boolean): CSSProperties {
  const base: CSSProperties = {
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };

  if (place === 1) {
    return { ...base, background: "#facc15", color: "#000", boxShadow: "0 1px 6px rgba(250,204,21,0.45)" };
  }
  if (place === 2) {
    return { ...base, background: "#94a3b8", color: "#fff", boxShadow: "0 1px 6px rgba(148,163,184,0.35)" };
  }
  if (place === 3) {
    return { ...base, background: "#d97706", color: "#fff", boxShadow: "0 1px 6px rgba(217,119,6,0.4)" };
  }
  return {
    ...base,
    background: isLight ? "#1f2937" : isGray ? "#374151" : "#4f7cff",
    color: "#fff",
    boxShadow: isLight ? "none" : "0 1px 6px rgba(79,124,255,0.35)",
  };
}

function qualifiedBadgeStyle(qualified: boolean, isLight: boolean): CSSProperties {
  const base: CSSProperties = {
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };

  if (qualified) {
    return {
      ...base,
      background: isLight ? "rgba(34, 197, 94, 0.18)" : "rgba(34, 197, 94, 0.2)",
      color: isLight ? "#166534" : "#4ade80",
      border: "1px solid rgba(34, 197, 94, 0.45)",
    };
  }
  return {
    ...base,
    background: isLight ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.18)",
    color: isLight ? "#991b1b" : "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.4)",
  };
}

function headerBtnStyle(
  active: boolean,
  colors: { btnBg: string; btnActive: string; accent: string }
): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    border: "none",
    borderRadius: 8,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    background: active ? colors.btnActive : colors.btnBg,
    color: active ? colors.accent : "inherit",
    whiteSpace: "nowrap",
  };
}

const styles: Record<string, CSSProperties> = {
  th: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(128,128,128,0.2)",
    verticalAlign: "middle",
    textAlign: "center",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(128,128,128,0.12)",
    verticalAlign: "middle",
  },
  countryCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textAlign: "left",
  },
};
