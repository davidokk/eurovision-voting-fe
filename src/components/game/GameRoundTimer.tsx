import { useEffect, useRef, useState } from "react";

type Props = {
  endsAt?: string;
  color?: string;
  onExpire?: () => void;
};

export function GameRoundTimer({ endsAt, color = "#7aa2ff", onExpire }: Props) {
  const [left, setLeft] = useState<number | null>(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;
    if (!endsAt) {
      setLeft(null);
      return;
    }

    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (Number.isNaN(ms)) {
        setLeft(null);
        return;
      }
      const newLeft = Math.max(0, Math.ceil(ms / 1000));
      setLeft(newLeft);
      if (newLeft === 0 && !expiredRef.current) {
        expiredRef.current = true;
        window.setTimeout(() => onExpireRef.current?.(), 0);
      }
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt]);

  if (left === null) return null;

  return (
    <div className="gts-round-timer" style={{ color }}>
      <span className="gts-round-timer__value">{left}</span>
      <span className="gts-round-timer__label">сек</span>
    </div>
  );
}
