import { useEffect, useState } from "react";
import {
    passwordSignin,
    passwordSignup,
    telegramSigninConfirm,
    telegramSigninStart,
    telegramSessionStatus,
    type ApiError,
} from "../api/auth";
import { fetchMe, setStoredAvatarUrl } from "../api/user";
import type { Theme } from "../types/contest";
import { formatAuthError } from "../api/authErrors";
import { CodeInput } from "./CodeInput";
import { applyAuthSession } from "../utils/jwt";

type Props = {
    onClose: () => void;
    onSuccess: (token: string) => void;
    theme?: Theme;
    initialMode?: "signin" | "signup";
};

type Step = "credentials" | "telegram";
type CredentialMode = "signin" | "signup";

async function persistSession(token: string) {
    setStoredAvatarUrl(null);
    applyAuthSession(token, { avatar_url: null });
    try {
        const me = await fetchMe(token);
        setStoredAvatarUrl(me.avatar_url ?? null);
        applyAuthSession(token, {
            avatar_url: me.avatar_url ?? null,
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
            await persistSession(res.token);
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
                    if (st.code_sent) {
                        setCodeSent(true);
                    }
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
            await persistSession(res.token);
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
        ? "rgba(255, 255, 255, 0.95)"
        : isGray
          ? "rgba(28, 28, 28, 0.95)"
          : "rgba(15, 23, 42, 0.95)";

    const modalBorder = isLight
        ? "1px solid rgba(0, 0, 0, 0.1)"
        : isGray
          ? "1px solid rgba(255, 255, 255, 0.1)"
          : "1px solid rgba(255, 255, 255, 0.08)";

    const titleColor = isLight ? "#0f172a" : "#fff";
    const subtitleColor = isLight ? "#64748b" : isGray ? "#9ca3af" : "#64748b";

    const btnBg = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)";

    const primaryGradient = isLight
        ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)"
        : isGray
          ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)"
          : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)";

    const primaryShadow = isLight
        ? "0 8px 24px rgba(31, 41, 55, 0.25)"
        : isGray
          ? "0 8px 24px rgba(0, 0, 0, 0.4)"
          : "0 8px 24px rgba(79, 124, 255, 0.35), inset 0 1px rgba(255,255,255,0.15)";

    const inputBorderColor = isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.08)";

    const promptBg = isLight
        ? "linear-gradient(135deg, rgba(55, 65, 81, 0.08), rgba(75, 85, 99, 0.05))"
        : isGray
          ? "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))"
          : "linear-gradient(135deg, rgba(79, 124, 255, 0.08), rgba(124, 77, 255, 0.06))";

    const promptBorder = isLight ? "1px solid rgba(55, 65, 81, 0.2)" : isGray ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(79, 124, 255, 0.2)";
    const promptHighlightColor = isLight ? "#1f2937" : isGray ? "#e5e7eb" : "#7aa2ff";

    const title =
        step === "telegram"
            ? "Код из Telegram"
            : credentialMode === "signin"
              ? "Вход"
              : "Регистрация";
    const subtitle =
        step === "telegram"
            ? "Новый Telegram — аккаунт создастся сам после ввода кода"
            : credentialMode === "signin"
              ? "Логин и пароль или вход через Telegram"
              : "Придумайте имя пользователя и пароль";

    const primaryLabel = loading
        ? "Загрузка..."
        : step === "credentials"
          ? credentialMode === "signin"
            ? "Войти"
            : "Создать аккаунт"
          : "Продолжить";

    const telegramStatus = codeSent
        ? { text: "Код отправлен в Telegram", tone: "success" as const }
        : botConnected
          ? { text: "Бот подключён — ждём код…", tone: "pending" as const }
          : { text: "После открытия нажмите Start / Запустить", tone: "muted" as const };

    const statusBannerBg =
        telegramStatus.tone === "success"
            ? isLight
                ? "rgba(34, 158, 217, 0.1)"
                : "rgba(34, 158, 217, 0.15)"
            : isLight
              ? "rgba(0, 0, 0, 0.04)"
              : isGray
                ? "rgba(255, 255, 255, 0.06)"
                : "rgba(255, 255, 255, 0.05)";

    const statusBannerBorder =
        telegramStatus.tone === "success"
            ? isLight
                ? "1px solid rgba(34, 158, 217, 0.35)"
                : "1px solid rgba(34, 158, 217, 0.4)"
            : isLight
              ? "1px solid rgba(0, 0, 0, 0.08)"
              : "1px solid rgba(255, 255, 255, 0.1)";

    const statusTextColor =
        telegramStatus.tone === "success"
            ? isLight
                ? "#0c4a6e"
                : "#7dd3fc"
            : subtitleColor;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div
                style={{
                    ...styles.modal,
                    background: modalBg,
                    border: modalBorder,
                    boxShadow: isLight ? "0 30px 80px rgba(0,0,0,0.15)" : styles.modal.boxShadow,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    style={{ ...styles.closeBtn, background: btnBg }}
                    onClick={onClose}
                >
                    ✕
                </button>

                <div
                    style={{
                        ...styles.iconWrap,
                        background: isLight
                            ? "linear-gradient(135deg, rgba(55, 65, 81, 0.15), rgba(75, 85, 99, 0.15))"
                            : isGray
                              ? "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))"
                              : styles.iconWrap.background,
                    }}
                >
                    <span style={styles.icon}>{step === "telegram" ? "✈️" : "🔑"}</span>
                </div>

                <h2 style={{ ...styles.title, color: titleColor }}>{title}</h2>
                <p style={{ ...styles.subtitle, color: subtitleColor }}>{subtitle}</p>

                {step === "credentials" && (
                    <div style={styles.form}>
                        <div
                            style={{
                                display: "flex",
                                gap: 6,
                                padding: 4,
                                borderRadius: 14,
                                background: btnBg,
                                border: inputBorderColor,
                            }}
                        >
                            {(["signin", "signup"] as const).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                        setCredentialMode(m);
                                        setError(null);
                                        setSignupClosed(false);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: "10px 12px",
                                        borderRadius: 11,
                                        border: "none",
                                        cursor: "pointer",
                                        fontWeight: 700,
                                        fontSize: 13,
                                        background:
                                            credentialMode === m ? primaryGradient : "transparent",
                                        color: credentialMode === m ? "#fff" : subtitleColor,
                                        boxShadow: credentialMode === m ? primaryShadow : "none",
                                    }}
                                >
                                    {m === "signin" ? "Вход" : "Регистрация"}
                                </button>
                            ))}
                        </div>

                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Имя пользователя"
                            autoComplete="username"
                            maxLength={32}
                            style={{
                                width: "100%",
                                padding: "14px 16px",
                                borderRadius: 14,
                                border: `1px solid ${inputBorderColor}`,
                                background: isLight ? "#fff" : isGray ? "#1a1a1a" : "rgba(15,23,42,0.6)",
                                color: titleColor,
                                fontSize: 15,
                                fontWeight: 600,
                                boxSizing: "border-box",
                            }}
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Пароль (мин. 6 символов)"
                            autoComplete={credentialMode === "signin" ? "current-password" : "new-password"}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void submitCredentials();
                            }}
                            style={{
                                width: "100%",
                                padding: "14px 16px",
                                borderRadius: 14,
                                border: `1px solid ${inputBorderColor}`,
                                background: isLight ? "#fff" : isGray ? "#1a1a1a" : "rgba(15,23,42,0.6)",
                                color: titleColor,
                                fontSize: 15,
                                fontWeight: 600,
                                boxSizing: "border-box",
                            }}
                        />

                        <button
                            type="button"
                            onClick={() => void startTelegramFlow()}
                            disabled={loading}
                            style={{
                                border: "none",
                                background: "transparent",
                                color: promptHighlightColor,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: loading ? "wait" : "pointer",
                                textDecoration: "underline",
                                textUnderlineOffset: 3,
                            }}
                        >
                            Или войти через Telegram
                        </button>
                    </div>
                )}

                {step === "telegram" && (
                    <div style={styles.form}>
                        <a
                            href={botURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 10,
                                width: "100%",
                                padding: "14px 18px",
                                borderRadius: 16,
                                background: "#229ED9",
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: 15,
                                textDecoration: "none",
                                boxSizing: "border-box",
                            }}
                        >
                            Открыть Telegram-бота
                        </a>

                        <div
                            style={{
                                ...styles.statusBanner,
                                background: statusBannerBg,
                                border: statusBannerBorder,
                                color: statusTextColor,
                            }}
                            role="status"
                        >
                            {telegramStatus.tone === "success" && (
                                <span style={styles.statusIcon} aria-hidden>
                                    ✓
                                </span>
                            )}
                            <span style={styles.statusText}>{telegramStatus.text}</span>
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
                    </div>
                )}

                {error && (
                    <div style={styles.error}>
                        <span>⚠</span>
                        <span>{error}</span>
                    </div>
                )}

                {signupClosed && (
                    <div style={{ ...styles.registerPrompt, background: promptBg, border: promptBorder }}>
                        <div style={{ ...styles.promptTitle, color: promptHighlightColor }}>
                            Регистрация закрыта :(
                        </div>
                        <div style={{ ...styles.promptText, color: subtitleColor }}>
                            Возвращайся в следующем году!
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => {
                        if (step === "credentials") void submitCredentials();
                        else void confirmCode();
                    }}
                    disabled={loading}
                    style={{
                        ...styles.button,
                        background: primaryGradient,
                        boxShadow: primaryShadow,
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    {primaryLabel}
                </button>

                {step === "telegram" && (
                    <button
                        type="button"
                        onClick={resetFlow}
                        style={{
                            border: "none",
                            background: "transparent",
                            color: subtitleColor,
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        ← Назад
                    </button>
                )}

                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        ...styles.secondary,
                        background: btnBg,
                        borderColor: inputBorderColor,
                        color: subtitleColor,
                    }}
                >
                    Закрыть
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
    },
    modal: {
        position: "relative",
        width: 440,
        maxWidth: "92vw",
        borderRadius: 28,
        padding: "40px 36px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 30px 80px rgba(0, 0, 0, 0.5)",
    },
    closeBtn: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 38,
        height: 38,
        borderRadius: 14,
        border: "none",
        color: "#94a3b8",
        cursor: "pointer",
        fontSize: 16,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, rgba(79, 124, 255, 0.2), rgba(124, 77, 255, 0.2))",
    },
    icon: { fontSize: 28 },
    title: { margin: 0, fontSize: 24, fontWeight: 900, textAlign: "center" },
    subtitle: { margin: 0, fontSize: 14, lineHeight: 1.5, textAlign: "center", maxWidth: 320 },
    form: { width: "100%", display: "flex", flexDirection: "column", gap: 12 },
    button: {
        width: "100%",
        padding: "16px 0",
        borderRadius: 16,
        border: "none",
        color: "#fff",
        fontWeight: 800,
        fontSize: 16,
        cursor: "pointer",
    },
    secondary: {
        width: "100%",
        padding: "14px 0",
        borderRadius: 16,
        border: "1px solid rgba(255, 255, 255, 0.06)",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
    },
    error: {
        width: "100%",
        display: "flex",
        gap: 8,
        color: "#ff6b6b",
        fontSize: 13,
        padding: "12px 16px",
        background: "rgba(255, 107, 107, 0.08)",
        borderRadius: 14,
        boxSizing: "border-box",
    },
    statusBanner: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "12px 16px",
        borderRadius: 14,
        boxSizing: "border-box",
        textAlign: "center",
    },
    statusIcon: {
        flexShrink: 0,
        width: 22,
        height: 22,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 800,
        background: "rgba(34, 158, 217, 0.25)",
        color: "#229ED9",
    },
    statusText: {
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.4,
    },
    registerPrompt: {
        width: "100%",
        padding: "16px 18px",
        borderRadius: 16,
        boxSizing: "border-box",
    },
    promptTitle: { fontSize: 14, fontWeight: 800 },
    promptText: { fontSize: 13, lineHeight: 1.5, marginTop: 4 },
};
