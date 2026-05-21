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
};

export function MyScoreAction({ mine, canVote, onRate, colors, inheritCellColor }: Props) {
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
            fontSize: 15,
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
    );
  }

  if (mine) {
    return (
      <span style={{ fontWeight: 800, fontSize: 15, color: scoreColor }}>
        {mine.score}
      </span>
    );
  }

  return <span style={{ color: colors.empty }}>—</span>;
}
