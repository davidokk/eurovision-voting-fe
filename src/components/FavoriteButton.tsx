import { useState } from "react";
import { Heart } from "lucide-react";
import type { Theme } from "../types/contest";
import { useFavoritesOptional } from "../hooks/useFavorites";

type Props = {
  performanceId: string | undefined | null;
  size?: number;
  className?: string;
  theme?: Theme;
  variant?: "icon" | "bar";
  titleAdd?: string;
  titleRemove?: string;
};

export function FavoriteButton({
  performanceId,
  size = 18,
  className = "",
  theme = "dark-blue",
  variant = "icon",
  titleAdd = "В избранное",
  titleRemove = "Убрать из избранного",
}: Props) {
  const favorites = useFavoritesOptional();
  const [pending, setPending] = useState(false);

  if (!favorites || !performanceId) return null;

  const token = localStorage.getItem("token");
  if (!token) return null;

  const active = favorites.isFavorite(performanceId);
  const label = active ? titleRemove : titleAdd;
  const iconSize = variant === "bar" ? Math.max(16, size) : size;

  return (
    <button
      type="button"
      data-theme={theme}
      className={`ev-favorite-btn${variant === "bar" ? " ev-favorite-btn--bar" : ""}${active ? " ev-favorite-btn--active" : ""}${className ? ` ${className}` : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={pending}
      onClick={() => {
        if (pending) return;
        setPending(true);
        void favorites.toggleFavorite(performanceId).finally(() => setPending(false));
      }}
    >
      <Heart size={iconSize} fill={active ? "currentColor" : "none"} strokeWidth={2.25} />
      {variant === "bar" ? <span className="ev-favorite-btn__label">{label}</span> : null}
    </button>
  );
}
