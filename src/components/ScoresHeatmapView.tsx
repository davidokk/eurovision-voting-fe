import { useMemo, useState, type CSSProperties } from "react";
import type { PerformanceWithScores, ScoreView } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { CountryScoresCell } from "./scores/CountryScoresCell";
import { MyScoreAction } from "./scores/MyScoreAction";
import { ScoresRateModal } from "./scores/ScoresRateModal";
import { useScoreTooltip } from "./scores/ScoreTooltipPortal";
import { useNarrowScreen } from "./scores/useNarrowScreen";
import {
  formatAvg,
  getScoresViewColors,
  heatCellStyles,
  type ScoresViewProps,
} from "./scores/scoresViewShared";
import { useScoresMatrix } from "./scores/useScoresMatrix";
import { useScoresViewAuth } from "./scores/useScoresViewAuth";
import { ScoreTwelveDisplay } from "./ScoreTwelveDisplay";
import { isScoreTwelve } from "../utils/scoreUtils";

export function ScoresHeatmapView({
  performances,
  theme = "dark-blue",
  contestType,
  votingStarted,
  votingEnded,
  isAuthenticated,
  onRated,
}: ScoresViewProps) {
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();
  const colors = getScoresViewColors(theme);
  const isNarrow = useNarrowScreen(720);
  const { canVote, showMyColumn, myScoreFor } = useScoresViewAuth({
    isAuthenticated,
    votingStarted,
    votingEnded,
  });
  const { users, rows } = useScoresMatrix(performances);
  const { setTooltip, showForCell, portal } = useScoreTooltip(theme);
  const [rateTarget, setRateTarget] = useState<PerformanceWithScores | null>(null);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => a.performance.number - b.performance.number);
  }, [rows]);

  function showHeatTooltip(el: HTMLElement, cell: ScoreView) {
    showForCell(el, cell);
    if (isNarrow) {
      window.setTimeout(() => setTooltip(null), 2200);
    }
  }

  if (performances.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: colors.empty }}>
        Нет выступлений
      </div>
    );
  }

  const shellStyle: CSSProperties = {
    maxWidth: 1200,
    margin: "0 auto",
    borderRadius: 16,
    border: colors.wrapBorder,
    background: colors.wrapBg,
    backdropFilter: "blur(12px)",
    overflow: "hidden",
    boxShadow: colors.shadow,
  };

  if (isNarrow) {
    return (
      <div style={shellStyle}>
        <div
          style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${colors.border}`,
            fontSize: 12,
            fontWeight: 700,
            color: colors.sub,
          }}
        >
          Heatmap · цвет = оценка
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {sortedRows.map((row, ri) => {
            const p = row.performance;
            const mine = myScoreFor(p);
            const rowBg = ri % 2 === 0 ? colors.cellBg : colors.cellAlt;
            const avgStyle = heatCellStyles(row.avg, colors.isLight, rowBg);
            const myStyle = heatCellStyles(mine?.score, colors.isLight, colors.myColBg);
            const scored = row.cells
              .map((cell, ci) => (cell ? { user: users[ci], cell } : null))
              .filter(
                (x): x is { user: { user_id: string; username: string }; cell: ScoreView } =>
                  !!x
              );

            return (
              <div
                key={p.performance_id}
                style={{
                  padding: "14px 14px 12px",
                  background: rowBg,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <CountryScoresCell
                      performance={p}
                      theme={theme}
                      contestType={contestType}
                      supportsEmoji={supportsEmoji}
                      textColor={colors.text}
                      subColor={colors.sub}
                      compact
                    />
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      minWidth: 52,
                      padding: "6px 8px",
                      borderRadius: 10,
                      background: avgStyle.background,
                      color: avgStyle.color,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        opacity: 0.85,
                        marginBottom: 2,
                      }}
                    >
                      Средн.
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>
                      {formatAvg(row.avg)}
                    </div>
                  </div>
                </div>

                {showMyColumn && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: myStyle.background,
                      color: myStyle.color,
                      marginBottom: scored.length > 0 ? 10 : 0,
                      border: `1px solid ${
                        colors.isLight
                          ? "rgba(79,124,255,0.2)"
                          : "rgba(79,124,255,0.35)"
                      }`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: colors.isLight ? "#475569" : "#94a3b8",
                      }}
                    >
                      Моя оценка
                    </span>
                    <MyScoreAction
                      mine={mine}
                      canVote={canVote}
                      onRate={() => canVote && setRateTarget(p)}
                      colors={colors}
                      inheritCellColor
                      compact
                    />
                  </div>
                )}

                {scored.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
                      gap: 6,
                    }}
                  >
                    {scored.map(({ user, cell }) => {
                      const cellStyle = heatCellStyles(
                        cell.score,
                        colors.isLight,
                        rowBg
                      );
                      const cellTwelve = isScoreTwelve(cell.score);
                      return (
                        <button
                          key={user.user_id}
                          type="button"
                          className={cellTwelve ? "ev-score-12-heatmap-cell" : undefined}
                          onClick={(e) => showHeatTooltip(e.currentTarget, cell)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "stretch",
                            gap: 4,
                            padding: "8px 8px 6px",
                            borderRadius: 10,
                            border: `1px solid ${colors.border}`,
                            background: cellStyle.background,
                            color: cellTwelve ? undefined : cellStyle.color,
                            cursor: "pointer",
                            textAlign: "left",
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              opacity: 0.85,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: colors.isLight ? "#334155" : "#cbd5e1",
                            }}
                            title={user.username}
                          >
                            {user.username}
                          </span>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: 15,
                              lineHeight: 1.1,
                            }}
                          >
                            <ScoreTwelveDisplay score={cell.score} variant="cell" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: colors.empty }}>
                    Пока нет оценок зрителей
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {portal}

        <ScoresRateModal
          rateTarget={rateTarget}
          theme={theme}
          myScoreFor={myScoreFor}
          onClose={() => setRateTarget(null)}
          onRated={onRated}
        />
      </div>
    );
  }

  const minWidth = Math.max(480, 200 + users.length * 52 + (showMyColumn ? 88 : 0) + 72);

  return (
    <div style={shellStyle}>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            minWidth,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  ...thStyle,
                  background: colors.headBg,
                  color: colors.headText,
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  minWidth: 180,
                  textAlign: "left",
                }}
              >
                Страна
              </th>
              <th
                style={{
                  ...thStyle,
                  background: colors.headBg,
                  color: colors.headText,
                  minWidth: 64,
                }}
              >
                Средн.
              </th>
              {showMyColumn && (
                <th
                  style={{
                    ...thStyle,
                    background: colors.headBg,
                    color: colors.headText,
                    minWidth: 80,
                  }}
                >
                  Моя
                </th>
              )}
              {users.map((u) => (
                <th
                  key={u.user_id}
                  style={{
                    ...thStyle,
                    background: colors.headBg,
                    color: colors.headText,
                    minWidth: 48,
                    maxWidth: 72,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={u.username}
                >
                  {u.username.length > 8 ? `${u.username.slice(0, 7)}…` : u.username}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, ri) => {
              const p = row.performance;
              const mine = myScoreFor(p);
              const rowBg = ri % 2 === 0 ? colors.cellBg : colors.cellAlt;
              const avgStyle = heatCellStyles(row.avg, colors.isLight, rowBg);
              const myStyle = heatCellStyles(mine?.score, colors.isLight, rowBg);

              return (
                <tr key={p.performance_id}>
                  <td
                    style={{
                      ...tdStyle,
                      background: colors.stickyBg,
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      borderRight: `1px solid ${colors.border}`,
                    }}
                  >
                    <CountryScoresCell
                      performance={p}
                      theme={theme}
                      contestType={contestType}
                      supportsEmoji={supportsEmoji}
                      textColor={colors.text}
                      subColor={colors.sub}
                      compact
                    />
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      background: avgStyle.background,
                      color: avgStyle.color,
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    {formatAvg(row.avg)}
                  </td>
                  {showMyColumn && (
                    <td
                      style={{
                        ...tdStyle,
                        background: myStyle.background,
                        color: myStyle.color,
                        textAlign: "center",
                        fontWeight: mine ? 800 : 400,
                        borderLeft: `2px solid ${colors.isLight ? "rgba(79,124,255,0.2)" : "rgba(79,124,255,0.35)"}`,
                        borderRight: `2px solid ${colors.isLight ? "rgba(79,124,255,0.2)" : "rgba(79,124,255,0.35)"}`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MyScoreAction
                        mine={mine}
                        canVote={canVote}
                        onRate={() => canVote && setRateTarget(p)}
                        colors={colors}
                        inheritCellColor
                      />
                    </td>
                  )}
                  {row.cells.map((cell, ci) => {
                    const u = users[ci];
                    const cellStyle = heatCellStyles(
                      cell?.score,
                      colors.isLight,
                      rowBg
                    );

                    const cellTwelve = cell != null && isScoreTwelve(cell.score);

                    return (
                      <td
                        key={`${p.performance_id}-${u?.user_id}`}
                        className={cellTwelve ? "ev-score-12-heatmap-cell" : undefined}
                        style={{
                          ...tdStyle,
                          background: cellStyle.background,
                          color: cellTwelve ? undefined : cellStyle.color,
                          fontWeight: cell ? 700 : 400,
                          textAlign: "center",
                          cursor: cell ? "help" : "default",
                          minWidth: 44,
                        }}
                        onMouseEnter={(e) =>
                          cell && showForCell(e.currentTarget, cell)
                        }
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {cell ? (
                          <ScoreTwelveDisplay score={cell.score} variant="cell" />
                        ) : (
                          ""
                        )}
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

      {portal}

      <ScoresRateModal
        rateTarget={rateTarget}
        theme={theme}
        myScoreFor={myScoreFor}
        onClose={() => setRateTarget(null)}
        onRated={onRated}
      />
    </div>
  );
}

const thStyle: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(128,128,128,0.2)",
  verticalAlign: "middle",
  textAlign: "center",
};

const tdStyle: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(128,128,128,0.12)",
  verticalAlign: "middle",
};
