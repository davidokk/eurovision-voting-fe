import type { ScoreView } from "../../types/contest";
import { ScoreTwelveDisplay } from "../ScoreTwelveDisplay";
import { isScoreTwelve } from "../../utils/scoreUtils";

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
  const scoreStyle = { fontSize: compact ? 14 : 15 };

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
            color: isScoreTwelve(mine.score) || inheritCellColor ? undefined : scoreColor,
          }}
        >
          <ScoreTwelveDisplay
            score={mine.score}
            variant="cell"
            style={!isScoreTwelve(mine.score) ? scoreStyle : undefined}
          />
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
      <ScoreTwelveDisplay
        score={mine.score}
        variant="cell"
        style={{
          ...scoreStyle,
          color: isScoreTwelve(mine.score) || inheritCellColor ? undefined : scoreColor,
        }}
      />
    );
  }

  return <span style={{ color: colors.empty }}>—</span>;
}
