import { useEffect, useRef, useState } from "react";
import { playCountdownBeep } from "../../utils/gameCountdownSound";

type Props = {
  endsAt: string;
  totalSec?: number;
};

function secondsLeft(endsAt: string): number | null {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 1000));
}

export function GameRoundCountdown({ endsAt, totalSec = 3 }: Props) {
  const [left, setLeft] = useState<number | null>(() => secondsLeft(endsAt));
  const lastBeepRef = useRef<number | null>(null);
  const endsAtKeyRef = useRef(endsAt);

  useEffect(() => {
    if (endsAtKeyRef.current !== endsAt) {
      endsAtKeyRef.current = endsAt;
      lastBeepRef.current = null;
    }
  }, [endsAt]);

  useEffect(() => {
    const tick = () => {
      const next = secondsLeft(endsAt);
      setLeft(next);
      if (next != null && next > 0 && next <= totalSec && lastBeepRef.current !== next) {
        lastBeepRef.current = next;
        playCountdownBeep("tick");
      }
      if (next === 0 && lastBeepRef.current !== 0) {
        lastBeepRef.current = 0;
        playCountdownBeep("start");
      }
    };

    tick();
    const id = window.setInterval(tick, 120);
    return () => clearInterval(id);
  }, [endsAt, totalSec]);

  if (left == null || left <= 0) return null;

  return (
    <div className="gts-countdown" aria-live="assertive" aria-label={`Старт через ${left}`}>
      <span className="gts-countdown__label">Старт через</span>
      <span className="gts-countdown__value">{left}</span>
    </div>
  );
}
