import type { CSSProperties } from "react";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  maxWidth?: number;
  maxHeight?: number;
};

export function GifPreview({
  src,
  alt = "reaction",
  className = "ev-gif-preview",
  style,
  maxWidth = 160,
  maxHeight = 120,
}: Props) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={{
        display: "block",
        maxWidth,
        maxHeight,
        width: "auto",
        height: "auto",
        objectFit: "contain",
        ...style,
      }}
    />
  );
}
