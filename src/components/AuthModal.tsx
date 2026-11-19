import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { KeyRound, X } from "lucide-react";
import {
  passwordSignin,
  passwordSignup,
  telegramSigninConfirm,
  telegramSigninStart,
  telegramSessionStatus,
  type ApiError,
} from "../api/auth";
import type { UserMe } from "../api/auth";
import { fetchMe, setStoredAvatarUrl } from "../api/user";
import type { Theme } from "../types/contest";
import { formatAuthError } from "../api/authErrors";
import { CodeInput } from "./CodeInput";
import { EvLoader } from "./EvLoader";
import { applyAuthSession } from "../utils/jwt";
import "../styles/auth-modal.css";

type Props = {
  onClose: () => void;
  onSuccess: (token: string) => void;
  theme?: Theme;
  initialMode?: "signin" | "signup";
};

type Step = "credentials" | "telegram";
type CredentialMode = "signin" | "signup";

function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

async function persistSession(token: string, user?: UserMe) {
  setStoredAvatarUrl(null);
  applyAuthSession(token, {
    avatar_url: null,
    user_id: user?.id,
    username: user?.username,
  });
  try {
    const me = await fetchMe(token);
    setStoredAvatarUrl(me.avatar_url ?? null);
    applyAuthSession(token, {
      avatar_url: me.avatar_url ?? null,
      user_id: me.id,
      username: me.username,
    });
  } catch {
    setStoredAvatarUrl(null);
  }
}

export function AuthModal({
  onClose,
  onSuccess,
  theme = "dark-blue",
  initialMode = "signin",
}: Props) {
  const [step, setStep] = useState<Step>("credentials");
  const [credentialMode, setCredentialMode] = useState<CredentialMode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [linkToken, setLinkToken] = useState("");
  const [botURL, setBotURL] = useState("");
  const [botConnected, setBotConnected] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupClosed, setSignupClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  function resetFlow() {
    setError(null);
    setStep("credentials");
    setCredentialMode(initialMode);
    setUsername("");
    setPassword("");
    setCode("");
    setLinkToken("");
    setBotURL("");
    setBotConnected(false);
    setCodeSent(false);
    setSignupClosed(false);
    setShowPasswordForm(false);
  }

  useEffect(() => {
    setCredentialMode(initialMode);
  }, [initialMode]);

  async function submitCredentials() {
    const u = username.trim();
    if (!u || !password) {
      setError("Введите логин и пароль");
      return;
    }
    if (password.length < 6) {
      setError("Пароль — минимум 6 символов");
      return;
    }
    setLoading(true);
    setError(null);
    setSignupClosed(false);
    try {
      const res =
        credentialMode === "signin"
          ? await passwordSignin(u, password)
          : await passwordSignup(u, password);
      await persistSession(res.token, res.user);
      onSuccess(res.token);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === "SIGNUP_CLOSED") {
        setSignupClosed(true);
        setError(null);
      } else {
        setError(formatAuthError(e));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (step !== "telegram" || !linkToken) return;

    const id = window.setInterval(() => {
      void telegramSessionStatus(linkToken)
        .then((st) => {
          setBotConnected(st.telegram_connected);
          if (st.code_sent) setCodeSent(true);
        })
        .catch(() => {});
    }, 2000);

    return () => window.clearInterval(id);
  }, [step, linkToken]);

  async function startTelegramFlow() {
    setLoading(true);
    setError(null);
    setSignupClosed(false);
    try {
      const res = await telegramSigninStart();
      setLinkToken(res.link_token);
      setBotURL(res.bot_url);
      setStep("telegram");
    } catch (err) {
      setError(formatAuthError(err as ApiError));
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    if (code.length !== 6) {
      setError("Введите все 6 цифр кода");
      return;
    }
    setLoading(true);
    setError(null);
    setSignupClosed(false);
    try {
      const res = await telegramSigninConfirm(linkToken, code.trim());
      await persistSession(res.token, res.user);
      onSuccess(res.token);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === "SIGNUP_CLOSED") {
        setSignupClosed(true);
        setError(null);
      } else {
        setError(formatAuthError(e));
      }
    } finally {
      setLoading(false);
    }
  }

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  const modalBg = isLight
    ? "rgba(255, 255, 255, 0.96)"
    : isGray
      ? "rgba(28, 28, 28, 0.96)"
      : "rgba(15, 23, 42, 0.96)";
  const modalBorder = isLight
    ? "1px solid rgba(0, 0, 0, 0.08)"
    : "1px solid rgba(255, 255, 255, 0.08)";
  const titleColor = isLight ? "#0f172a" : "#fff";
  const mutedColor = isLight ? "#64748b" : isGray ? "#9ca3af" : "#94a3b8";
  const softBg = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)";
  const softBorder = isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";
  const inputBg = isLight ? "#fff" : isGray ? "#1a1a1a" : "rgba(15, 23, 42, 0.7)";
  const primaryGradient = isLight
    ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)"
    : isGray
      ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)"
      : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)";
  const primaryShadow = isLight
    ? "0 8px 22px rgba(31, 41, 55, 0.22)"
    : isGray
      ? "0 8px 22px rgba(0, 0, 0, 0.35)"
      : "0 8px 22px rgba(79, 124, 255, 0.3)";
  const badgeBg = isLight
    ? "rgba(42, 171, 238, 0.12)"
    : "rgba(42, 171, 238, 0.16)";
  const badgeColor = isLight ? "#0284c7" : "#7dd3fc";

  const title =
    step === "telegram"
      ? "Код из Telegram"
      : showPasswordForm
        ? credentialMode === "signin"
          ? "Вход"
          : "Регистрация"
        : "Вход";

  const badgeIcon: ReactNode =
    step === "telegram" || !showPasswordForm ? (
      <TelegramIcon size={24} />
    ) : (
      <KeyRound size={22} strokeWidth={2.25} />
    );

  const telegramStatus = codeSent
    ? { text: "Код отправлен", tone: "success" as const }
    : botConnected
      ? { text: "Ждём код…", tone: "pending" as const }
      : { text: "Откройте бота и нажмите Start", tone: "muted" as const };

  const statusStyle: CSSProperties =
    telegramStatus.tone === "success"
      ? {
          background: isLight ? "rgba(42, 171, 238, 0.1)" : "rgba(42, 171, 238, 0.14)",
          color: isLight ? "#0369a1" : "#7dd3fc",
          border: `1px solid ${isLight ? "rgba(42, 171, 238, 0.28)" : "rgba(42, 171, 238, 0.3)"}`,
        }
      : {
          background: softBg,
          color: mutedColor,
          border: `1px solid ${softBorder}`,
        };

  return (
    <div className="ev-auth-overlay" onClick={onClose}>
      <div
        className="ev-auth-modal"
        style={{
          background: modalBg,
          border: modalBorder,
          boxShadow: isLight
            ? "0 24px 64px rgba(0,0,0,0.14)"
            : "0 24px 64px rgba(0,0,0,0.5)",
          color: titleColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="ev-auth-close"
          style={{ background: softBg, color: mutedColor }}
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        <div className="ev-auth-head">
          <div
            className="ev-auth-badge"
            style={{
              background: showPasswordForm && step === "credentials" ? softBg : badgeBg,
              color: showPasswordForm && step === "credentials" ? mutedColor : badgeColor,
            }}
          >
            {badgeIcon}
          </div>
          <h2 className="ev-auth-title" style={{ color: titleColor }}>
            {title}
          </h2>
        </div>

        <div className="ev-auth-body">
          {step === "credentials" && !showPasswordForm && (
            <>
              <button
                type="button"
                className="ev-auth-btn ev-auth-btn--telegram"
                disabled={loading}
                onClick={() => void startTelegramFlow()}
              >
                {loading ? <EvLoader size="xs" label="Подключаем Telegram" /> : <><TelegramIcon size={20} />Войти через Telegram</>}
              </button>

              <div className="ev-auth-divider" style={{ color: mutedColor }}>
                или
              </div>

              <button
                type="button"
                className="ev-auth-btn ev-auth-btn--soft"
                style={{
                  background: softBg,
                  color: titleColor,
                  border: `1px solid ${softBorder}`,
                }}
                onClick={() => {
                  setShowPasswordForm(true);
                  setError(null);
                  setSignupClosed(false);
                }}
              >
                <KeyRound size={16} strokeWidth={2.25} />
                Логин и пароль
              </button>
            </>
          )}

          {step === "credentials" && showPasswordForm && (
            <>
              <div className="ev-auth-tabs" style={{ background: softBg }}>
                {(["signin", "signup"] as const).map((m) => {
                  const active = credentialMode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      className="ev-auth-tab"
                      onClick={() => {
                        setCredentialMode(m);
                        setError(null);
                        setSignupClosed(false);
                      }}
                      style={{
                        background: active ? primaryGradient : "transparent",
                        color: active ? "#fff" : mutedColor,
                        boxShadow: active ? primaryShadow : "none",
                      }}
                    >
                      {m === "signin" ? "Вход" : "Регистрация"}
                    </button>
                  );
                })}
              </div>

              <input
                className="ev-auth-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Имя пользователя"
                autoComplete="username"
                maxLength={32}
                style={{
                  background: inputBg,
                  color: titleColor,
                  borderColor: softBorder,
                }}
              />
              <input
                className="ev-auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                autoComplete={
                  credentialMode === "signin" ? "current-password" : "new-password"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitCredentials();
                }}
                style={{
                  background: inputBg,
                  color: titleColor,
                  borderColor: softBorder,
                }}
              />

              <button
                type="button"
                className="ev-auth-btn ev-auth-btn--primary"
                disabled={loading}
                onClick={() => void submitCredentials()}
                style={{ background: primaryGradient, boxShadow: primaryShadow }}
              >
                {loading ? (
                  <EvLoader size="xs" label="Проверяем" />
                ) : credentialMode === "signin" ? (
                  "Войти"
                ) : (
                  "Создать аккаунт"
                )}
              </button>

              <button
                type="button"
                className="ev-auth-btn ev-auth-btn--ghost"
                style={{ color: mutedColor }}
                onClick={() => {
                  setShowPasswordForm(false);
                  setError(null);
                  setSignupClosed(false);
                }}
              >
                <TelegramIcon size={16} />
                Войти через Telegram
              </button>
            </>
          )}

          {step === "telegram" && (
            <>
              <a
                href={botURL}
                target="_blank"
                rel="noopener noreferrer"
                className="ev-auth-btn ev-auth-btn--telegram"
              >
                <TelegramIcon size={20} />
                Открыть бота
              </a>

              <div className="ev-auth-status" style={statusStyle} role="status">
                {telegramStatus.text}
              </div>

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
                className="ev-auth-btn ev-auth-btn--primary"
                disabled={loading}
                onClick={() => void confirmCode()}
                style={{ background: primaryGradient, boxShadow: primaryShadow }}
              >
                {loading ? <EvLoader size="xs" label="Проверяем код" /> : "Продолжить"}
              </button>

              <button
                type="button"
                className="ev-auth-btn ev-auth-btn--ghost"
                style={{ color: mutedColor }}
                onClick={resetFlow}
              >
                Назад
              </button>
            </>
          )}

          {error && (
            <div className="ev-auth-error">
              <span aria-hidden>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {signupClosed && (
            <div
              className="ev-auth-closed"
              style={{
                background: softBg,
                border: `1px solid ${softBorder}`,
              }}
            >
              <div className="ev-auth-closed__title" style={{ color: titleColor }}>
                Регистрация закрыта
              </div>
              <div className="ev-auth-closed__text" style={{ color: mutedColor }}>
                Возвращайся в следующем году
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
