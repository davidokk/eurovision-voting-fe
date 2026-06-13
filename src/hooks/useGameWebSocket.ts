import { useEffect, useRef } from "react";
import type { GameEvent } from "../types/game";

const PING_INTERVAL_MS = 25_000;
const MAX_BACKOFF_MS = 30_000;

type Options = {
  wsUrl: string;
  token: string | null;
  roomCode: string;
  enabled: boolean;
  onMessage: (msg: GameEvent) => void;
  onConnected?: () => void;
};

export function useGameWebSocket({
  wsUrl,
  token,
  roomCode,
  enabled,
  onMessage,
  onConnected,
}: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(2000);
  const intentionalCloseRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  const onConnectedRef = useRef(onConnected);
  const paramsRef = useRef({ wsUrl, token, roomCode, enabled });

  onMessageRef.current = onMessage;
  onConnectedRef.current = onConnected;
  paramsRef.current = { wsUrl, token, roomCode, enabled };

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
    reconnectTimerRef.current = setTimeout(openSocket, delay);
  };

  const openSocket = () => {
    const { wsUrl: baseUrl, token: tok, roomCode: code, enabled: en } = paramsRef.current;
    if (!en || !baseUrl || !code || !tok) return;
    if (isSocketActive()) return;

    intentionalCloseRef.current = false;
    clearPing();
    clearReconnect();

    const base = baseUrl.replace(/\/$/, "");
    const url = `${base}/v1/game/ws?token=${encodeURIComponent(tok)}&room=${encodeURIComponent(code)}`;

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
        const msg = JSON.parse(raw) as GameEvent;
        if (msg.type === "pong") return;
        onMessageRef.current(msg);
      } catch {
        // ignore
      }
    };

    socket.onclose = () => {
      if (wsRef.current === socket) wsRef.current = null;
      clearPing();
      scheduleReconnect();
    };

    socket.onerror = () => socket.close();
  };

  useEffect(() => {
    if (!enabled || !wsUrl || !roomCode || !token) {
      closeSocket(true);
      return;
    }
    openSocket();
    return () => closeSocket(true);
  }, [enabled, wsUrl, token, roomCode]);

  const sendBuzz = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "game.buzz" }));
    }
  };

  return { sendBuzz };
}
