import { useEffect, useRef } from "react";
import type { Theme } from "../types/contest";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  theme?: Theme;
  hasError?: boolean;
};

export function CodeInput({ value, onChange, disabled, theme = "dark-blue", hasError }: Props) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const border = hasError
    ? "2px solid #ef4444"
    : isLight
      ? "2px solid #e2e8f0"
      : "2px solid rgba(255,255,255,0.12)";
  const bg = isLight ? "#f8fafc" : isGray ? "#252525" : "rgba(15,23,42,0.85)";
  const text = isLight ? "#0f172a" : "#f8fafc";
  const focusBorder = hasError ? "#ef4444" : isLight ? "#4f46e5" : "#7aa2ff";

  useEffect(() => {
    if (value.length === 0) {
      inputsRef.current[0]?.focus();
    }
  }, []);

  function updateAt(index: number, char: string) {
    const d = char.replace(/\D/g, "").slice(-1);
    const arr = [...digits];
    arr[index] = d;
    onChange(arr.join("").replace(/\s/g, ""));
    if (d && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        updateAt(index, "");
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        updateAt(index - 1, "");
      }
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    inputsRef.current[focusIdx]?.focus();
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        width: "100%",
      }}
      onPaste={handlePaste}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => updateAt(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          style={{
            width: 44,
            height: 52,
            textAlign: "center",
            fontSize: 24,
            fontWeight: 800,
            borderRadius: 12,
            border,
            background: bg,
            color: text,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            opacity: disabled ? 0.6 : 1,
          }}
          onFocusCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = focusBorder;
            (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${hasError ? "rgba(239,68,68,0.2)" : isLight ? "rgba(79,70,229,0.15)" : "rgba(79,124,255,0.25)"}`;
          }}
          onBlurCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = hasError ? "#ef4444" : isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)";
            (e.target as HTMLInputElement).style.boxShadow = "none";
          }}
        />
      ))}
    </div>
  );
}
