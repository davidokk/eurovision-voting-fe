import { useMemo, useState, type CSSProperties } from "react";
import type { PerformanceWithScores } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { CountryScoresCell } from "./scores/CountryScoresCell";
import { MyScoreAction } from "./scores/MyScoreAction";
import { ScoresRateModal } from "./scores/ScoresRateModal";
import { useScoreTooltip } from "./scores/ScoreTooltipPortal";
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

  if (performances.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: colors.empty }}>
        Нет выступлений
      </div>
    );
  }

  const minWidth = Math.max(480, 200 + users.length * 52 + (showMyColumn ? 88 : 0) + 72);

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
        boxShadow: colors.shadow,
      }}
    >
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
