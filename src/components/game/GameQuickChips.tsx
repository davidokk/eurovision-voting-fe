type Props = {
  label: string;
  value: number;
  chips: number[];
  suffix?: string;
  onSelect: (value: number) => void;
};

export function GameQuickChips({ label, value, chips, suffix, onSelect }: Props) {
  return (
    <div className="gts-quick-chips">
      <span className="gts-quick-chips__label">
        {label}
        {suffix ? ` · ${suffix}` : ""}
      </span>
      <div className="gts-quick-chips__row">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className={`gts-quick-chips__chip ${value === chip ? "gts-quick-chips__chip--active" : ""}`}
            onClick={() => onSelect(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
