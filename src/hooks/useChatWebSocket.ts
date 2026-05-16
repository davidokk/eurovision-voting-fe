import { useEffect, useRef } from "react";

const PING_INTERVAL_MS = 25_000;
const MAX_BACKOFF_MS = 30_000;

type Options<T> = {
    wsUrl: string;
    token: string | null;
    enabled: boolean;
    onMessage: (msg: T) => void;
    /** После успешного подключения (не на каждый лишний connect) */
    onConnected?: () => void;
};

export function useChatWebSocket<T extends { type?: string }>({
    wsUrl,
    token,
    enabled,
    onMessage,
    onConnected,
}: Options<T>) {
    const wsRef = useRef<WebSocket | null>(null);
    const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const backoffRef = useRef(2000);
    const intentionalCloseRef = useRef(false);
    const onMessageRef = useRef(onMessage);
    const onConnectedRef = useRef(onConnected);
    const paramsRef = useRef({ wsUrl, token, enabled });

    onMessageRef.current = onMessage;
    onConnectedRef.current = onConnected;
    paramsRef.current = { wsUrl, token, enabled };

    const clearPing = () => {
        if (pingTimerRef.current) {
            clearInterval(pingTimerRef.current);
            pingTimerRef.current = null;
        }
    };

    const clearReconnect = () => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    };

    const isSocketActive = () => {
        const s = wsRef.current?.readyState;
        return s === WebSocket.OPEN || s === WebSocket.CONNECTING;
    };

    const closeSocket = (intentional: boolean) => {
        intentionalCloseRef.current = intentional;
        clearPing();
        clearReconnect();
        const ws = wsRef.current;
        if (!ws) return;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        wsRef.current = null;
    };

    const scheduleReconnect = () => {
        const { enabled: en } = paramsRef.current;
        if (!en || intentionalCloseRef.current) {
            intentionalCloseRef.current = false;
            return;
        }
        if (isSocketActive()) return;

        clearReconnect();
        const delay = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
        reconnectTimerRef.current = setTimeout(() => {
            openSocket();
        }, delay);
    };

    const openSocket = () => {
        const { wsUrl: baseUrl, token: tok, enabled: en } = paramsRef.current;
        if (!en || !baseUrl) return;
        if (isSocketActive()) return;

        intentionalCloseRef.current = false;
        clearPing();
        clearReconnect();

        const base = baseUrl.replace(/\/$/, "");
        const url = tok
            ? `${base}/v1/ws?token=${encodeURIComponent(tok)}`
            : `${base}/v1/ws`;

        const socket = new WebSocket(url);
        wsRef.current = socket;

        socket.onopen = () => {
            backoffRef.current = 2000;
            onConnectedRef.current?.();

            pingTimerRef.current = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: "ping" }));
                }
            }, PING_INTERVAL_MS);
        };

        socket.onmessage = (event) => {
            const raw = typeof event.data === "string" ? event.data : "";
            if (!raw || raw.includes('"type":"pong"')) return;
            try {
                const msg = JSON.parse(raw) as T;
                if ((msg as { type?: string }).type === "pong") return;
                onMessageRef.current(msg);
            } catch {
                // ignore
            }
        };

        socket.onclose = () => {
            if (wsRef.current === socket) {
                wsRef.current = null;
            }
            clearPing();
            scheduleReconnect();
        };

        socket.onerror = () => {
            // onclose вызовется следом — reconnect только там
            socket.close();
        };
    };

    // Переподключение только при смене url/token/enabled, не при каждом ре-рендере
    useEffect(() => {
        if (!enabled || !wsUrl) {
            closeSocket(true);
            return;
        }

        openSocket();

        const onOnline = () => {
            if (!paramsRef.current.enabled) return;
            if (!isSocketActive()) {
                backoffRef.current = 2000;
                openSocket();
            }
        };

        const onVisible = () => {
            if (document.visibilityState !== "visible") return;
            if (!paramsRef.current.enabled) return;
            if (!isSocketActive()) {
                backoffRef.current = 2000;
                openSocket();
            }
        };

        window.addEventListener("online", onOnline);
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            window.removeEventListener("online", onOnline);
            document.removeEventListener("visibilitychange", onVisible);
            closeSocket(true);
        };
    }, [enabled, wsUrl, token]);
}
