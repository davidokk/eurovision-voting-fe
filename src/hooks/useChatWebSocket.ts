import { useCallback, useEffect, useRef } from "react";

const PING_INTERVAL_MS = 25_000;
const MAX_BACKOFF_MS = 30_000;

type Options<T> = {
    wsUrl: string;
    token: string | null;
    enabled: boolean;
    onMessage: (msg: T) => void;
    /** Вызывается после успешного подключения (в т.ч. переподключения) */
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
    const mountedRef = useRef(true);
    const onMessageRef = useRef(onMessage);
    const onConnectedRef = useRef(onConnected);

    onMessageRef.current = onMessage;
    onConnectedRef.current = onConnected;

    const clearPing = useCallback(() => {
        if (pingTimerRef.current) {
            clearInterval(pingTimerRef.current);
            pingTimerRef.current = null;
        }
    }, []);

    const clearReconnect = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (!mountedRef.current || !enabled) return;
        clearReconnect();
        const delay = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
        reconnectTimerRef.current = setTimeout(() => {
            connectRef.current();
        }, delay);
    }, [enabled, clearReconnect]);

    const connectRef = useRef<() => void>(() => {});

    const connect = useCallback(() => {
        if (!mountedRef.current || !enabled || !wsUrl) return;

        clearPing();
        clearReconnect();

        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.close();
            wsRef.current = null;
        }

        const base = wsUrl.replace(/\/$/, "");
        const url = token
            ? `${base}/v1/ws?token=${encodeURIComponent(token)}`
            : `${base}/v1/ws`;

        const socket = new WebSocket(url);
        wsRef.current = socket;

        socket.onopen = () => {
            if (!mountedRef.current) return;
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
                // ignore malformed payloads
            }
        };

        socket.onclose = () => {
            clearPing();
            if (mountedRef.current && enabled) {
                scheduleReconnect();
            }
        };

        socket.onerror = () => {
            socket.close();
        };
    }, [wsUrl, token, enabled, clearPing, clearReconnect, scheduleReconnect]);

    connectRef.current = connect;

    useEffect(() => {
        mountedRef.current = true;
        if (enabled) {
            connect();
        }

        const onOnline = () => {
            if (enabled) connect();
        };
        const onVisible = () => {
            if (document.visibilityState === "visible" && enabled) {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                    connect();
                }
            }
        };

        window.addEventListener("online", onOnline);
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            mountedRef.current = false;
            window.removeEventListener("online", onOnline);
            document.removeEventListener("visibilitychange", onVisible);
            clearPing();
            clearReconnect();
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [enabled, connect, clearPing, clearReconnect]);
}
