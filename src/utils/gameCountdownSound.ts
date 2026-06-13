let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playCountdownBeep(kind: "tick" | "start" = "tick") {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = kind === "start" ? 880 : 520;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(kind === "start" ? 0.12 : 0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "start" ? 0.22 : 0.14));

  osc.start(now);
  osc.stop(now + 0.25);
}
