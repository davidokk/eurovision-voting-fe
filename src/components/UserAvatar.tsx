import type { CSSProperties } from "react";
import type { Theme } from "../types/contest";

type Props = {
  username?: string | null;
  avatarUrl?: string | null;
  size?: number;
  theme?: Theme;
  style?: CSSProperties;
};

export function UserAvatar({
  username,
  avatarUrl,
  size = 32,
  theme = "dark-blue",
  style,
}: Props) {
  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const initial = username?.charAt(0).toUpperCase() || "?";

  const gradient = isLight
    ? "linear-gradient(135deg, #4b5563, #1f2937)"
    : isGray
      ? "linear-gradient(135deg, #6b7280, #374151)"
      : "linear-gradient(135deg, #4f7cff, #7c4dff)";

  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.35),
    flexShrink: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: Math.max(11, Math.round(size * 0.42)),
    color: "#fff",
    background: gradient,
    boxShadow: isLight
      ? "0 4px 14px rgba(31, 41, 55, 0.2)"
      : "0 4px 14px rgba(79, 124, 255, 0.25)",
    ...style,
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        style={{
          ...base,
          objectFit: "cover",
          borderRadius: "50%",
        }}
      />
    );
  }

  return <div style={base}>{initial}</div>;
}
