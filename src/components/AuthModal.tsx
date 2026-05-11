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

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleAuth() {
        setLoading(true);
        setError(null);

        try {
            const res = await signin(username, password);

            const token = res.token;

            localStorage.setItem("token", token);

            // 🔥 парсим JWT
            const payload = parseJwt(token);

            if (payload?.username) {
                localStorage.setItem("username", payload.username);
            }

            onSuccess(token);

            return;

        } catch (err) {
            const e = err as ApiError;

            if (e.code === "USER_NOT_EXISTS") {
                try {
                    const res = await signup(username, password);

                    const token = res.token;

                    localStorage.setItem("token", token);

                    // 🔥 парсим JWT и после signup
                    const payload = parseJwt(token);

                    if (payload?.username) {
                        localStorage.setItem("username", payload.username);
                    }

                    onSuccess(token);

                    return;

                } catch (signupErr) {
                    const se = signupErr as ApiError;

                    setError(se.message || "ошибка регистрации");
                    return;
                }
            }

            setError(e.message || "ошибка авторизации");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Вход в систему</h2>

                <input
                    placeholder="имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.input}
                />

                <input
                    type="password"
                    placeholder="пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                />

                {error && (
                    <div style={styles.error}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleAuth}
                    disabled={loading}
                    style={styles.button}
                >
                    {loading ? "загрузка..." : "Войти"}
                </button>

                <button
                    onClick={onClose}
                    style={styles.secondary}
                >
                    закрыть
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {

    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(11, 18, 32, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
    },

    modal: {
        width: 520,               // 🔥 БЫЛО 420
        background: "#111a2e",
        border: "1px solid #24324f",
        borderRadius: 18,
        padding: 32,              // 🔥 БЫЛО 24
        display: "flex",
        flexDirection: "column",
        gap: 16,                  // 🔥 БЫЛО 12
        boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
    },

    title: {
        margin: 0,
        color: "#e6edf7",
        fontSize: 26,             // 🔥 БЫЛО ~20
        fontWeight: 700,
    },

    input: {
        padding: 16,              // 🔥 БЫЛО 12
        borderRadius: 12,
        border: "1px solid #24324f",
        background: "#16213a",
        color: "#e6edf7",
        outline: "none",
        fontSize: 16,             // 🔥 добавили
    },

    button: {
        padding: 14,              // 🔥 БЫЛО 12
        borderRadius: 12,
        border: "none",
        background: "#4f7cff",
        color: "white",
        fontWeight: 700,
        fontSize: 16,
        cursor: "pointer",
    },

    secondary: {
        padding: 14,
        borderRadius: 12,
        border: "1px solid #24324f",
        background: "transparent",
        color: "#e6edf7",
        cursor: "pointer",
        fontSize: 15,
    },

    error: {
        color: "#ff6b6b",
        fontSize: 14,
    },
};