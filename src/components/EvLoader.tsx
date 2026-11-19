import { getScoreColor } from "../utils/scoreUtils";
import "./EvLoader.css";

const PIPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];

type Size = "xs" | "sm" | "md" | "lg";

type Props = {
  label?: string;
  size?: Size;
};

export function EvLoader({ label, size = "md" }: Props) {
  return (
    <div className={`ev-loader ev-loader--${size}`} role="status" aria-live="polite">
      <div className="ev-loader__stage" aria-hidden>
        {PIPS.map((score, i) => (
          <span
            key={score}
            className={`ev-loader__pip${score === 12 ? " ev-loader__pip--twelve" : ""}`}
            style={{
              ["--i" as string]: i,
              ["--a" as string]: `${(360 / PIPS.length) * i}deg`,
              ["--pip-color" as string]: getScoreColor(score),
            }}
          />
        ))}
        <span className="ev-loader__core">12</span>
      </div>
      {label ? (
        <span className="ev-loader__label">{label}</span>
      ) : (
        <span className="ev-loader__sr">Загрузка</span>
      )}
    </div>
  );
}
