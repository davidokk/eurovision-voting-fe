type Props = {
  thumbUrl: string | null;
  title: string;
  subtitle: string;
  meta?: string;
  selected: boolean;
  disabled?: boolean;
  textColor: string;
  subColor: string;
  cardBorder: string;
  inputBg: string;
  onClick: () => void;
};

export function GameSongGridCard({
  thumbUrl,
  title,
  subtitle,
  meta,
  selected,
  disabled,
  textColor,
  subColor,
  cardBorder,
  inputBg,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      className={`gts-grid-card ${selected ? "gts-grid-card--selected" : ""}`}
      style={{
        color: textColor,
        border: selected ? undefined : cardBorder,
        background: inputBg,
      }}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="gts-grid-card__media">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="gts-grid-card__img" loading="lazy" />
        ) : (
          <span className="gts-grid-card__img gts-grid-card__img--placeholder">🎬</span>
        )}
        <span className="gts-grid-card__badge">{selected ? "✓" : "+"}</span>
      </span>
      <span className="gts-grid-card__info">
        <strong className="gts-grid-card__title">{title}</strong>
        <span className="gts-grid-card__subtitle">{subtitle}</span>
        {meta ? (
          <span className="gts-grid-card__meta" style={{ color: subColor }}>
            {meta}
          </span>
        ) : null}
      </span>
    </button>
  );
}
