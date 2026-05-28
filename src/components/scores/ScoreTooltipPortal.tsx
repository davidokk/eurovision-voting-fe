import { useState } from "react";
import { createPortal } from "react-dom";
import type { ScoreView, Theme } from "../../types/contest";
import { ScoreTwelveDisplay } from "../ScoreTwelveDisplay";
import { isScoreTwelve } from "../../utils/scoreUtils";

export type TooltipState = {
  score: number;
  comment?: string;
  left: number;
  top: number;
} | null;

export function useScoreTooltip(theme: Theme) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  function showForCell(el: HTMLElement, cell: ScoreView) {
    const rect = el.getBoundingClientRect();
    setTooltip({
      score: cell.score,
      comment: cell.comment?.trim() || undefined,
      left: rect.left + rect.width / 2,
      top: rect.top,
    });
  }

  const tooltipTheme = {
    bg: isLight ? "#ffffff" : isGray ? "#262626" : "#1e293b",
    border: isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #404040" : "1px solid #475569",
    text: isLight ? "#0f172a" : "#e2e8f0",
    score: isLight ? "#d97706" : "#ffd166",
    comment: isLight ? "#64748b" : "#94a3b8",
    shadow: isLight
      ? "0 10px 28px rgba(0,0,0,0.12)"
      : "0 10px 28px rgba(0,0,0,0.45)",
  };

  const portal =
    tooltip &&
    createPortal(
      <div
        style={{
          position: "fixed",
          left: tooltip.left,
          top: tooltip.top,
          transform: "translate(-50%, calc(-100% - 8px))",
          maxWidth: 300,
          padding: "10px 12px",
          borderRadius: 10,
          background: tooltipTheme.bg,
          border: tooltipTheme.border,
          boxShadow: tooltipTheme.shadow,
          pointerEvents: "none",
          zIndex: 10000,
        }}
      >
        <div style={{ marginBottom: tooltip.comment ? 6 : 0 }}>
          <ScoreTwelveDisplay
            score={tooltip.score}
            variant="inline"
            prefix={isScoreTwelve(tooltip.score) ? undefined : "⭐ "}
            style={
              isScoreTwelve(tooltip.score)
                ? undefined
                : { fontWeight: 800, fontSize: 14, color: tooltipTheme.score }
            }
          />
        </div>
        {tooltip.comment ? (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.45,
              color: tooltipTheme.comment,
              whiteSpace: "pre-wrap",
            }}
          >
            {tooltip.comment}
          </div>
        ) : null}
      </div>,
      document.body
    );

  return { tooltip, setTooltip, showForCell, portal };
}
