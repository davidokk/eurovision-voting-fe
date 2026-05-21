import type { ScoreView } from "../../types/contest";

type Colors = {
  empty: string;
  rateBtn: string;
  gold: string;
};

type Props = {
  mine: ScoreView | undefined;
  canVote: boolean;
  onRate: () => void;
  colors: Colors;
  /** В heatmap: наследовать цвет ячейки вместо золотого */
  inheritCellColor?: boolean;
  compact?: boolean;
};

export function MyScoreAction({ mine, canVote, onRate, colors, inheritCellColor, compact }: Props) {
  const scoreColor = inheritCellColor ? "inherit" : colors.gold;

  if (canVote) {
    if (mine) {
      return (
        <button
          type="button"
          onClick={onRate}
          title="Изменить оценку"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: 800,
          fontSize: compact ? 14 : 15,
          color: scoreColor,
        }}
      >
        {mine.score}
      </button>
    );
    }
    return (
      <button
        type="button"
        onClick={onRate}
        style={{
          border: "none",
          borderRadius: 8,
          padding: compact ? "4px 8px" : "5px 10px",
          fontSize: compact ? 10 : 11,
          fontWeight: 800,
          color: "#fff",
          cursor: "pointer",
          background: colors.rateBtn,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Оценить
      </button>
    );
  }

  if (mine) {
    return (
      <span style={{ fontWeight: 800, fontSize: compact ? 14 : 15, color: scoreColor }}>
        {mine.score}
      </span>
    );
  }

  return <span style={{ color: colors.empty }}>—</span>;
}
