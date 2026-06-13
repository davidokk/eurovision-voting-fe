import { useEffect } from "react";
import type { GameJudgement, GameJudgeOutcome } from "../../types/game";

type Props = {
  judgement: GameJudgement | null;
  pointsPerCorrect: number;
  onDismiss: () => void;
};

export function resolveJudgementOutcome(j: GameJudgement, pointsPerCorrect: number): GameJudgeOutcome {
  if (j.outcome === "full" || j.outcome === "half" || j.outcome === "wrong") {
    return j.outcome;
  }
  if (!j.correct) return "wrong";
  if (j.delta > 0 && j.delta < pointsPerCorrect) return "half";
  return "full";
}

function popupContent(j: GameJudgement, pointsPerCorrect: number) {
  const outcome = resolveJudgementOutcome(j, pointsPerCorrect);
  const half = Math.max(1, Math.floor(pointsPerCorrect / 2));

  if (outcome === "full") {
    const pts = j.delta > 0 ? j.delta : pointsPerCorrect;
    return {
      outcome,
      icon: "✓",
      delta: `+${pts}`,
      title: "Верно!",
      subtitle: `${j.username} получает ${pts} ${pts === 1 ? "балл" : pts < 5 ? "балла" : "баллов"}`,
    };
  }
  if (outcome === "half") {
    const pts = j.delta > 0 ? j.delta : half;
    return {
      outcome,
      icon: "◐",
      delta: `+${pts}`,
      title: "Почти!",
      subtitle: `${j.username} — полбалла (+${pts})`,
    };
  }
  const pts = j.delta < 0 ? Math.abs(j.delta) : pointsPerCorrect;
  return {
    outcome,
    icon: "✗",
    delta: j.delta < 0 ? `−${pts}` : "0",
    title: "Неверно",
    subtitle: j.delta < 0 ? `${j.username} теряет ${pts} ${pts === 1 ? "балл" : pts < 5 ? "балла" : "баллов"}` : `${j.username} — без баллов`,
  };
}

export function GameJudgementPopup({ judgement, pointsPerCorrect, onDismiss }: Props) {
  useEffect(() => {
    if (!judgement) return;
    const t = window.setTimeout(onDismiss, 2400);
    return () => window.clearTimeout(t);
  }, [judgement, onDismiss]);

  if (!judgement) return null;

  const content = popupContent(judgement, pointsPerCorrect);

  return (
    <div className="gts-judge-popup-layer" role="status" aria-live="assertive">
      <div className={`gts-judge-popup gts-judge-popup--${content.outcome}`}>
        <div className="gts-judge-popup__burst" aria-hidden />
        <span className="gts-judge-popup__icon">{content.icon}</span>
        <span className="gts-judge-popup__delta">{content.delta}</span>
        <strong className="gts-judge-popup__title">{content.title}</strong>
        <span className="gts-judge-popup__subtitle">{content.subtitle}</span>
        <span className="gts-judge-popup__total">Счёт: {judgement.points}</span>
      </div>
    </div>
  );
}
