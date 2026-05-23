import { useState } from "react";
import { confirmEmailBind, requestEmailBind, type ApiError } from "../api/auth";
import { formatAuthError } from "../api/authErrors";
import { fetchMe, setStoredAvatarUrl } from "../api/user";
import type { Theme } from "../types/contest";
import { CodeInput } from "./CodeInput";
import { applyAuthSession } from "../utils/jwt";

type Props = {
  theme?: Theme;
  onVerified: () => void;
  legacyHint?: boolean;
};

export function EmailVerifyModal({ theme = "dark-blue", onVerified, legacyHint }: Props) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const modalBg = isLight ? "rgba(255,255,255,0.98)" : isGray ? "rgba(28,28,28,0.98)" : "rgba(15,23,42,0.98)";
  const border = isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)";
  const text = isLight ? "#0f172a" : "#f8fafc";
  const sub = isLight ? "#64748b" : "#94a3b8";
  const inputBg = isLight ? "#f8fafc" : isGray ? "#252525" : "rgba(15,23,42,0.8)";
  const primary = isLight ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "linear-gradient(135deg,#4f7cff,#7c4dff)";

  async function handleSendCode() {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await requestEmailBind(email.trim());
      setInfo("Код отправлен на почту");
      setStep("code");
      setCode("");
    } catch (err) {
      setError(formatAuthError(err as ApiError));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (code.length !== 6) {
      setError("Введите все 6 цифр кода");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await confirmEmailBind(email.trim(), code.trim());
      const me = await fetchMe(res.token);
      setStoredAvatarUrl(me.avatar_url ?? null);
      applyAuthSession(res.token, {
        email_verified: true,
        avatar_url: me.avatar_url ?? null,
      });
      onVerified();
    } catch (err) {
      setError(formatAuthError(err as ApiError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: modalBg,
          border,
          borderRadius: 24,
          padding: "32px 28px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
      >
        <h2 style={{ margin: "0 0 8px", color: text, fontSize: 22, fontWeight: 900 }}>
          Подтвердите email
        </h2>
        <p style={{ margin: "0 0 20px", color: sub, fontSize: 14, lineHeight: 1.5 }}>
          {legacyHint
            ? "Для продолжения привяжите и подтвердите почту. Мы отправим 6-значный код."
            : "Введите почту — мы отправим 6-значный код для активации аккаунта."}
        </p>

        {step === "email" ? (
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border,
              background: inputBg,
              color: text,
              fontSize: 15,
              boxSizing: "border-box",
              marginBottom: 12,
            }}
          />
        ) : (
          <>
            <p style={{ margin: "0 0 12px", color: sub, fontSize: 13, textAlign: "center" }}>
              Код отправлен на <strong style={{ color: text }}>{email}</strong>
            </p>
            <CodeInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              disabled={loading}
              theme={theme}
              hasError={!!error && code.length === 6}
            />
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              style={{
                display: "block",
                margin: "12px auto 0",
                border: "none",
                background: "transparent",
                color: sub,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Изменить email
            </button>
          </>
        )}

        {info && (
          <div style={{ color: "#22c55e", fontSize: 13, marginTop: 12, textAlign: "center" }}>{info}</div>
        )}
        {error && (
          <div
            style={{
              color: "#f87171",
              fontSize: 13,
              marginTop: 12,
              textAlign: "center",
              lineHeight: 1.45,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading || (step === "code" && code.length !== 6)}
          onClick={() => void (step === "email" ? handleSendCode() : handleConfirm())}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "14px 0",
            borderRadius: 14,
            border: "none",
            background: primary,
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            cursor: loading ? "wait" : "pointer",
            opacity: loading || (step === "code" && code.length !== 6) ? 0.7 : 1,
          }}
        >
          {loading ? "Подождите…" : step === "email" ? "Отправить код" : "Подтвердить"}
        </button>
      </div>
    </div>
  );
}
