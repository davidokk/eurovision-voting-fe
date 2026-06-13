import { useEffect, useRef, useState } from "react";

type Props = {
  endsAt?: string;
  totalSec?: number;
  paused?: boolean;
  onExpire?: () => void;
};

function secondsLeft(endsAt: string): number | null {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 1000));
}

function tone(left: number, paused: boolean): "paused" | "critical" | "warn" | "normal" {
  if (paused) return "paused";
  if (left <= 3) return "critical";
  if (left <= 6) return "warn";
  return "normal";
}

export function GameRoundTimer({ endsAt, totalSec = 10, paused = false, onExpire }: Props) {
  const [left, setLeft] = useState<number | null>(() => (endsAt ? secondsLeft(endsAt) : null));
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  const roundTotalRef = useRef(Math.max(1, totalSec));
  const endsAtKeyRef = useRef<string | null>(null);

  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!endsAt) return;
    if (endsAtKeyRef.current !== endsAt) {
      endsAtKeyRef.current = endsAt;
      expiredRef.current = false;
    }
    roundTotalRef.current = Math.max(1, totalSec);
  }, [endsAt, totalSec]);

  useEffect(() => {
    if (!endsAt) {
      setLeft(null);
      return;
    }
    if (paused) return;

    const tick = () => {
      const newLeft = secondsLeft(endsAt);
      if (newLeft === null) {
        setLeft(null);
        return;
      }
      setLeft(newLeft);
      if (newLeft === 0 && !expiredRef.current) {
        expiredRef.current = true;
        window.setTimeout(() => onExpireRef.current?.(), 0);
      }
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt, paused]);

  useEffect(() => {
    if (!endsAt || paused) return;
    const next = secondsLeft(endsAt);
    if (next !== null) setLeft(next);
  }, [endsAt, paused]);

  if (left === null) return null;

  const total = roundTotalRef.current;
  const progress = Math.min(100, Math.max(0, (left / total) * 100));
  const t = tone(left, paused);

  return (
    <div
      className={`gts-timer-bar gts-timer-bar--${t}`}
      aria-live="polite"
      aria-label={paused ? `Пауза, осталось ${left} секунд` : `Осталось ${left} секунд`}
    >
      <div className="gts-timer-bar__track" aria-hidden>
        <div className="gts-timer-bar__fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="gts-timer-bar__readout">
        {paused && <span className="gts-timer-bar__pause-mark">⏸</span>}
        <span className="gts-timer-bar__value">{left}</span>
        <span className="gts-timer-bar__unit">сек</span>
      </div>
    </div>
  );
}
