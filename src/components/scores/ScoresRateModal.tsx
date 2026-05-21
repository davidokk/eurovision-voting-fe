import type { PerformanceWithScores, ScoreView, Theme } from "../../types/contest";
import { RatePerformanceModal } from "../RatePerformanceModal";

type Props = {
  rateTarget: PerformanceWithScores | null;
  theme: Theme;
  myScoreFor: (p: PerformanceWithScores) => ScoreView | undefined;
  onClose: () => void;
  onRated?: () => void;
};

export function ScoresRateModal({ rateTarget, theme, myScoreFor, onClose, onRated }: Props) {
  if (!rateTarget) return null;

  const mine = myScoreFor(rateTarget);

  return (
    <RatePerformanceModal
      performance={rateTarget}
      theme={theme}
      open
      initialScore={mine?.score ?? null}
      initialComment={mine?.comment ?? ""}
      initialGifUrl={mine?.gif_url ?? null}
      onClose={onClose}
      onSuccess={() => onRated?.()}
    />
  );
}
