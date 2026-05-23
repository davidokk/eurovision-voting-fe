import { useState } from "react";
import {
    signin,
    signupConfirm,
    signupStart,
    passwordForgot,
    passwordReset,
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
};

type Mode = "signin" | "signup" | "forgot";

async function persistSession(token: string) {
    setStoredAvatarUrl(null);
    applyAuthSession(token, { avatar_url: null });
    try {
        const me = await fetchMe(token);
        setStoredAvatarUrl(me.avatar_url ?? null);
        applyAuthSession(token, {
            email_verified: me.email_verified,
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
}: Props) {
    const [mode, setMode] = useState<Mode>("signin");
    const [signupStep, setSignupStep] = useState<"form" | "code">("form");
    const [forgotStep, setForgotStep] = useState<"email" | "code">("email");

    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
    const [signupClosed, setSignupClosed] = useState(false);
    const [loading, setLoading] = useState(false);

    function resetFlow() {
        setError(null);
        setInfo(null);
        setSignupStep("form");
        setForgotStep("email");
        setCode("");
    }

    async function handleSignin() {
        setLoading(true);
        setError(null);
        setShowRegisterPrompt(false);
        try {
            const res = await signin(email.trim(), password);
            await persistSession(res.token);
            onSuccess(res.token);
        } catch (err) {
            const e = err as ApiError;
            if (e.code === "USER_NOT_EXISTS") {
                setShowRegisterPrompt(true);
                setError(null);
            } else {
                setError(formatAuthError(e));
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleSignupStart() {
        setLoading(true);
        setError(null);
        try {
            await signupStart(email.trim(), username.trim(), password);
            setInfo("Код отправлен на почту");
            setSignupStep("code");
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

    async function handleSignupConfirm() {
        setLoading(true);
        setError(null);
        try {
            const res = await signupConfirm(email.trim(), code.trim());
            await persistSession(res.token);
            onSuccess(res.token);
        } catch (err) {
            const e = err as ApiError;
            setError(formatAuthError(e));
        } finally {
            setLoading(false);
        }
    }

    async function handleForgotSend() {
        setLoading(true);
        setError(null);
        try {
            await passwordForgot(email.trim());
            setInfo("Если аккаунт существует, код отправлен на почту");
            setForgotStep("code");
        } catch (err) {
            const e = err as ApiError;
            setError(formatAuthError(e));
        } finally {
            setLoading(false);
        }
    }

    async function handleForgotReset() {
        setLoading(true);
        setError(null);
        try {
            await passwordReset(email.trim(), code.trim(), password);
            setInfo("Пароль обновлён. Войдите с новым паролем.");
            setMode("signin");
            setForgotStep("email");
            setPassword("");
            setCode("");
        } catch (err) {
            const e = err as ApiError;
            setError(formatAuthError(e));
        } finally {
            setLoading(false);
        }
    }

    const codeStepActive =
        (mode === "signup" && signupStep === "code") || (mode === "forgot" && forgotStep === "code");

    async function handlePrimary() {
        if (mode === "signin") await handleSignin();
        else if (mode === "signup") {
            if (signupStep === "form") await handleSignupStart();
            else await handleSignupConfirm();
        } else if (forgotStep === "email") await handleForgotSend();
        else await handleForgotReset();
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

    const tabsWrapperBg = isLight ? "rgba(0, 0, 0, 0.04)" : isGray ? "rgba(0, 0, 0, 0.2)" : "rgba(15, 23, 42, 0.6)";
    const inputBg = isLight ? "rgba(0, 0, 0, 0.03)" : isGray ? "rgba(0, 0, 0, 0.2)" : "rgba(15, 23, 42, 0.6)";
    const inputTextColor = isLight ? "#0f172a" : isGray ? "#f3f4f6" : "#e6edf7";
    const inputBorderColor = isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.08)";

    const promptBg = isLight
        ? "linear-gradient(135deg, rgba(55, 65, 81, 0.08), rgba(75, 85, 99, 0.05))"
        : isGray
          ? "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))"
          : "linear-gradient(135deg, rgba(79, 124, 255, 0.08), rgba(124, 77, 255, 0.06))";

    const promptBorder = isLight ? "1px solid rgba(55, 65, 81, 0.2)" : isGray ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(79, 124, 255, 0.2)";
    const promptHighlightColor = isLight ? "#1f2937" : isGray ? "#e5e7eb" : "#7aa2ff";

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "16px 18px",
        borderRadius: 16,
        border: `1px solid ${inputBorderColor}`,
        background: inputBg,
        color: inputTextColor,
        outline: "none",
        fontSize: 15,
        boxSizing: "border-box",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    };

    const title =
        mode === "forgot"
            ? "Восстановление пароля"
            : mode === "signin"
              ? "Вход в систему"
              : signupStep === "code"
                ? "Подтверждение почты"
                : "Регистрация";

    const subtitle =
        mode === "forgot"
            ? forgotStep === "email"
                ? "Укажите email — отправим код для сброса пароля"
                : "Введите код из письма и новый пароль"
            : mode === "signin"
              ? "Войдите по email (старые аккаунты — можно по имени пользователя)"
              : signupStep === "code"
                ? `Код отправлен на ${email}`
                : "Создайте аккаунт — на почту придёт код подтверждения";

    const primaryLabel =
        loading
            ? "Загрузка..."
            : mode === "signin"
              ? "Войти"
              : mode === "signup"
                ? signupStep === "form"
                  ? "Отправить код"
                  : "Подтвердить и войти"
                : forgotStep === "email"
                  ? "Отправить код"
                  : "Сохранить пароль";

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
                    <span style={styles.icon}>🎤</span>
                </div>

                <h2 style={{ ...styles.title, color: titleColor }}>{title}</h2>
                <p style={{ ...styles.subtitle, color: subtitleColor }}>{subtitle}</p>

                {mode !== "forgot" && (
                    <div style={{ ...styles.tabs, background: tabsWrapperBg, borderColor: inputBorderColor }}>
                        <button
                            type="button"
                            style={{
                                ...styles.tab,
                                color: mode === "signin" ? "#fff" : subtitleColor,
                                background: mode === "signin" ? primaryGradient : "transparent",
                            }}
                            onClick={() => {
                                setMode("signin");
                                resetFlow();
                                setSignupClosed(false);
                            }}
                        >
                            Вход
                        </button>
                        <button
                            type="button"
                            style={{
                                ...styles.tab,
                                color: mode === "signup" ? "#fff" : subtitleColor,
                                background: mode === "signup" ? primaryGradient : "transparent",
                            }}
                            onClick={() => {
                                setMode("signup");
                                resetFlow();
                                setSignupClosed(false);
                            }}
                        >
                            Регистрация
                        </button>
                    </div>
                )}

                <div style={styles.form}>
                    {(mode === "signin" || mode === "signup" || mode === "forgot") &&
                        (mode !== "signup" || signupStep === "form") &&
                        (mode !== "forgot" || forgotStep === "email") && (
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={inputStyle}
                            />
                        )}

                    {mode === "signup" && signupStep === "form" && (
                        <input
                            placeholder="Твое имя"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={inputStyle}
                        />
                    )}

                    {(mode === "signin" ||
                        (mode === "signup" && signupStep === "form") ||
                        (mode === "forgot" && forgotStep === "code")) && (
                        <input
                            type="password"
                            placeholder={
                                mode === "forgot" && forgotStep === "code" ? "Новый пароль" : "Пароль"
                            }
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && void handlePrimary()}
                            style={inputStyle}
                        />
                    )}

                    {codeStepActive && (
                        <div style={{ marginTop: 4 }}>
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
                </div>

                {info && <div style={{ ...styles.info, width: "100%" }}>{info}</div>}
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

                {showRegisterPrompt && (
                    <div style={{ ...styles.registerPrompt, background: promptBg, border: promptBorder }}>
                        <div style={{ ...styles.promptTitle, color: promptHighlightColor }}>
                            Аккаунт не найден
                        </div>
                        <div style={{ ...styles.promptText, color: subtitleColor }}>
                            Перейдите на вкладку «Регистрация», чтобы создать аккаунт по email.
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => void handlePrimary()}
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

                {mode === "signin" && (
                    <button
                        type="button"
                        onClick={() => {
                            setMode("forgot");
                            resetFlow();
                        }}
                        style={{
                            border: "none",
                            background: "transparent",
                            color: promptHighlightColor,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        Забыли пароль?
                    </button>
                )}

                {mode === "forgot" && (
                    <button
                        type="button"
                        onClick={() => {
                            setMode("signin");
                            resetFlow();
                        }}
                        style={{
                            border: "none",
                            background: "transparent",
                            color: subtitleColor,
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        ← Назад ко входу
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
    tabs: {
        display: "flex",
        gap: 4,
        width: "100%",
        borderRadius: 16,
        padding: 4,
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxSizing: "border-box",
    },
    tab: {
        flex: 1,
        padding: "12px 0",
        border: "none",
        cursor: "pointer",
        borderRadius: 13,
        fontSize: 14,
        fontWeight: 700,
    },
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
    info: {
        color: "#4ade80",
        fontSize: 13,
        padding: "8px 12px",
        boxSizing: "border-box",
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
