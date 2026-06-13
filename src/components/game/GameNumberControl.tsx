import { ChevronDown, ChevronUp } from "lucide-react";
import type { CSSProperties } from "react";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  chips?: number[];
  onChange: (value: number) => void;
  onApply?: (value: number) => void | Promise<void>;
  appliedValue?: number | null;
  suffix?: string;
  textColor: string;
  subColor: string;
  border: string;
  inputBg: string;
  accent: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function GameNumberControl({
  label,
  value,
  min,
  max,
  chips = [],
  onChange,
  onApply,
  appliedValue,
  suffix,
  textColor,
  subColor,
  border,
  inputBg,
  accent,
}: Props) {
  const saved = appliedValue ?? value;
  const isDirty = onApply != null && value !== saved;

  function step(delta: number) {
    onChange(clamp(value + delta, min, max));
  }

  function handleInput(raw: string) {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    onChange(clamp(n, min, max));
  }

  const btnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 10,
    border,
    background: inputBg,
    color: textColor,
    cursor: "pointer",
    flexShrink: 0,
  };

  return (
    <div className="gts-num-control">
      <div className="gts-num-control__head">
        <span className="gts-num-control__label" style={{ color: subColor }}>
          {label}
          {suffix ? ` (${suffix})` : ""}
        </span>
        {onApply && !isDirty && (
          <span className="gts-num-control__saved" style={{ color: accent }}>
            ✓ {saved}
          </span>
        )}
      </div>
      <div className="gts-num-control__row">
        <button type="button" className="gts-num-step" style={btnStyle} onClick={() => step(-1)} aria-label="Меньше">
          <ChevronDown size={18} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          className="gts-num-input"
          value={value}
          onChange={(e) => handleInput(e.target.value.replace(/\D/g, ""))}
          style={{ border, background: inputBg, color: textColor }}
        />
        <button type="button" className="gts-num-step" style={btnStyle} onClick={() => step(1)} aria-label="Больше">
          <ChevronUp size={18} />
        </button>
        {onApply && (
          <button
            type="button"
            className={`gts-num-apply ${isDirty ? "gts-num-apply--active" : ""}`}
            disabled={!isDirty}
            onClick={() => void onApply(value)}
          >
            Применить
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <div className="gts-num-chips">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`gts-num-chip ${value === chip ? "gts-num-chip--active" : ""}`}
              style={{ border, color: value === chip ? accent : textColor }}
              onClick={() => {
                onChange(chip);
                onApply?.(chip);
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
