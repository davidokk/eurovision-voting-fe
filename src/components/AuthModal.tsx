import { useState } from "react";

import {
    signin,
    signup,
} from "../api/auth";

type Props = {
    onClose: () => void;
    onSuccess: (token: string) => void;
};

type ApiError = {
    message: string;
    code?: string;
};

function parseJwt(token: string) {
    try {
        const base64 = token.split(".")[1];

        const json = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => {
                    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );

        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function AuthModal({
    onClose,
    onSuccess,
}: Props) {

    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSignin() {
        setLoading(true);
        setError(null);
        setShowRegisterPrompt(false);

        try {
            const res = await signin(username, password);

            const token = res.token;

            localStorage.setItem("token", token);

            const payload = parseJwt(token);

            if (payload?.username) {
                localStorage.setItem("username", payload.username);
            }

            onSuccess(token);

        } catch (err) {
            const e = err as ApiError;

            if (e.code === "USER_NOT_EXISTS") {
                setShowRegisterPrompt(true);
                setError(null);
            } else {
                setError(e.message || "ошибка авторизации");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleSignup() {
        setLoading(true);
        setError(null);

        try {
            const res = await signup(username, password);

            const token = res.token;

            localStorage.setItem("token", token);

            const payload = parseJwt(token);

            if (payload?.username) {
                localStorage.setItem("username", payload.username);
            }

            onSuccess(token);

        } catch (err) {
            const e = err as ApiError;
            setError(e.message || "ошибка регистрации");
        } finally {
            setLoading(false);
        }
    }

    async function handleAuth() {
        if (mode === "signin") {
            await handleSignin();
        } else {
            await handleSignup();
        }
    }

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div
                style={styles.modal}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Кнопка закрытия */}
                <button
                    style={styles.closeBtn}
                    onClick={onClose}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(255, 255, 255, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(255, 255, 255, 0.06)";
                    }}
                >
                    ✕
                </button>

                {/* Иконка */}
                <div style={styles.iconWrap}>
                    <span style={styles.icon}>🎤</span>
                </div>

                {/* Заголовок */}
                <h2 style={styles.title}>
                    {mode === "signin" ? "Вход в систему" : "Регистрация"}
                </h2>
                <p style={styles.subtitle}>
                    {mode === "signin"
                        ? "Войдите, чтобы оценивать выступления и участвовать в чате"
                        : "Создайте аккаунт, чтобы оценивать выступления и участвовать в чате"
                    }
                </p>

                {/* Табы */}
                <div style={styles.tabs}>
                    <button
                        style={{
                            ...styles.tab,
                            ...(mode === "signin" ? styles.tabActive : {}),
                        }}
                        onClick={() => {
                            setMode("signin");
                            setError(null);
                            setShowRegisterPrompt(false);
                        }}
                    >
                        Вход
                    </button>
                    <button
                        style={{
                            ...styles.tab,
                            ...(mode === "signup" ? styles.tabActive : {}),
                        }}
                        onClick={() => {
                            setMode("signup");
                            setError(null);
                            setShowRegisterPrompt(false);
                        }}
                    >
                        Регистрация
                    </button>
                </div>

                {/* Поля ввода */}
                <div style={styles.form}>
                    <input
                        placeholder="Имя пользователя"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={styles.input}
                        onFocus={(e) => {
                            (e.currentTarget as HTMLInputElement).style.borderColor =
                                "rgba(79, 124, 255, 0.5)";
                            (e.currentTarget as HTMLInputElement).style.boxShadow =
                                "0 0 20px rgba(79, 124, 255, 0.1)";
                        }}
                        onBlur={(e) => {
                            (e.currentTarget as HTMLInputElement).style.borderColor =
                                "rgba(255, 255, 255, 0.08)";
                            (e.currentTarget as HTMLInputElement).style.boxShadow =
                                "none";
                        }}
                    />

                    <input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                        style={styles.input}
                        onFocus={(e) => {
                            (e.currentTarget as HTMLInputElement).style.borderColor =
                                "rgba(79, 124, 255, 0.5)";
                            (e.currentTarget as HTMLInputElement).style.boxShadow =
                                "0 0 20px rgba(79, 124, 255, 0.1)";
                        }}
                        onBlur={(e) => {
                            (e.currentTarget as HTMLInputElement).style.borderColor =
                                "rgba(255, 255, 255, 0.08)";
                            (e.currentTarget as HTMLInputElement).style.boxShadow =
                                "none";
                        }}
                    />
                </div>

                {/* Ошибка */}
                {error && (
                    <div style={styles.error}>
                        <span style={{ fontSize: 14 }}>⚠</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Предложение зарегистрироваться */}
                {showRegisterPrompt && (
                    <div style={styles.registerPrompt}>
                        <span style={styles.promptIcon}>✨</span>
                        <div style={styles.promptContent}>
                            <div style={styles.promptTitle}>
                                Пользователь не найден
                            </div>
                            <div style={styles.promptText}>
                                Такого аккаунта ещё нет. Перейдите на вкладку
                                <span style={styles.promptHighlight}> Регистрация</span>,
                                чтобы создать его — это быстро!
                            </div>
                        </div>
                    </div>
                )}

                {/* Кнопки */}
                <button
                    onClick={handleAuth}
                    disabled={loading}
                    style={{
                        ...styles.button,
                        opacity: loading ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                        if (!loading) {
                            (e.currentTarget as HTMLButtonElement).style.boxShadow =
                                "0 12px 35px rgba(79, 124, 255, 0.5), inset 0 1px rgba(255,255,255,0.2)";
                            (e.currentTarget as HTMLButtonElement).style.transform =
                                "translateY(-2px)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                            "0 8px 24px rgba(79, 124, 255, 0.35), inset 0 1px rgba(255,255,255,0.15)";
                        (e.currentTarget as HTMLButtonElement).style.transform =
                            "translateY(0)";
                    }}
                >
                    {loading
                        ? "Загрузка..."
                        : mode === "signin"
                            ? "Войти"
                            : "Создать аккаунт"
                    }
                </button>

                <button
                    onClick={onClose}
                    style={styles.secondary}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(255, 255, 255, 0.08)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor =
                            "rgba(255, 255, 255, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(255, 255, 255, 0.03)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor =
                            "rgba(255, 255, 255, 0.06)";
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
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
    },

    modal: {
        position: "relative",
        width: 440,
        maxWidth: "92vw",
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 28,
        padding: "40px 36px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        boxShadow: `
            0 30px 80px rgba(0, 0, 0, 0.5),
            0 0 60px rgba(79, 124, 255, 0.06),
            inset 0 1px rgba(255, 255, 255, 0.06)
        `,
    },

    closeBtn: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 38,
        height: 38,
        borderRadius: 14,
        border: "none",
        background: "rgba(255, 255, 255, 0.06)",
        color: "#94a3b8",
        cursor: "pointer",
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.2s ease",
    },

    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 20,
        background: "linear-gradient(135deg, rgba(79, 124, 255, 0.2), rgba(124, 77, 255, 0.2))",
        border: "1px solid rgba(79, 124, 255, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
        boxShadow: "0 8px 24px rgba(79, 124, 255, 0.15)",
    },

    icon: {
        fontSize: 28,
        filter: "drop-shadow(0 2px 8px rgba(79, 124, 255, 0.4))",
    },

    title: {
        margin: 0,
        color: "#fff",
        fontSize: 24,
        fontWeight: 900,
        letterSpacing: "-0.02em",
        textAlign: "center",
    },

    subtitle: {
        margin: 0,
        color: "#64748b",
        fontSize: 14,
        lineHeight: 1.5,
        textAlign: "center",
        maxWidth: 320,
    },

    tabs: {
        display: "flex",
        gap: 4,
        width: "100%",
        background: "rgba(15, 23, 42, 0.6)",
        borderRadius: 16,
        padding: 4,
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxSizing: "border-box",
        marginTop: 4,
    },

    tab: {
        flex: 1,
        padding: "12px 0",
        border: "none",
        background: "transparent",
        color: "#64748b",
        cursor: "pointer",
        borderRadius: 13,
        fontSize: 14,
        fontWeight: 700,
        transition: "all 0.25s ease",
    },

    tabActive: {
        background: "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
        color: "#fff",
        boxShadow: "0 4px 16px rgba(79, 124, 255, 0.3)",
    },

    form: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: 4,
    },

    input: {
        width: "100%",
        padding: "16px 18px",
        borderRadius: 16,
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(15, 23, 42, 0.6)",
        color: "#e6edf7",
        outline: "none",
        fontSize: 15,
        boxSizing: "border-box",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },

    button: {
        width: "100%",
        padding: "16px 0",
        borderRadius: 16,
        border: "none",
        background: "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
        color: "#fff",
        fontWeight: 800,
        fontSize: 16,
        cursor: "pointer",
        letterSpacing: "0.02em",
        boxShadow: "0 8px 24px rgba(79, 124, 255, 0.35), inset 0 1px rgba(255,255,255,0.15)",
        transition: "all 0.2s ease",
        marginTop: 4,
    },

    secondary: {
        width: "100%",
        padding: "14px 0",
        borderRadius: 16,
        border: "1px solid rgba(255, 255, 255, 0.06)",
        background: "rgba(255, 255, 255, 0.03)",
        color: "#94a3b8",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        transition: "all 0.2s ease",
    },

    error: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "#ff6b6b",
        fontSize: 13,
        padding: "12px 16px",
        background: "rgba(255, 107, 107, 0.08)",
        border: "1px solid rgba(255, 107, 107, 0.15)",
        borderRadius: 14,
        boxSizing: "border-box",
    },

    registerPrompt: {
        width: "100%",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "16px 18px",
        background: "linear-gradient(135deg, rgba(79, 124, 255, 0.08), rgba(124, 77, 255, 0.06))",
        border: "1px solid rgba(79, 124, 255, 0.2)",
        borderRadius: 16,
        boxSizing: "border-box",
        boxShadow: "0 4px 16px rgba(79, 124, 255, 0.08)",
    },

    promptIcon: {
        fontSize: 22,
        flexShrink: 0,
        marginTop: 1,
    },

    promptContent: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },

    promptTitle: {
        color: "#7aa2ff",
        fontSize: 14,
        fontWeight: 800,
    },

    promptText: {
        color: "#94a3b8",
        fontSize: 13,
        lineHeight: 1.5,
    },

    promptHighlight: {
        color: "#7aa2ff",
        fontWeight: 700,
    },
};
