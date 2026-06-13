import type { GameCatalogItem, GameRoomView } from "../types/game";

const API_URL = import.meta.env.VITE_API_URL || "";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchGameCatalog(): Promise<GameCatalogItem[]> {
  const res = await fetch(`${API_URL}/v1/game/catalog`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export async function createGameRoom(): Promise<GameRoomView> {
  const res = await fetch(`${API_URL}/v1/game/rooms`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Не удалось создать игру");
  return res.json();
}

export async function joinGameRoom(code: string): Promise<GameRoomView> {
  const res = await fetch(`${API_URL}/v1/game/rooms/${encodeURIComponent(code)}/join`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Комната не найдена");
  return res.json();
}

export async function getGameRoom(code: string): Promise<GameRoomView> {
  const res = await fetch(`${API_URL}/v1/game/rooms/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error("Комната не найдена");
  return res.json();
}

export async function gameRoomAction(
  code: string,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<GameRoomView> {
  const res = await fetch(`${API_URL}/v1/game/rooms/${encodeURIComponent(code)}/action`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Ошибка действия");
  }
  return res.json();
}

export async function gameBuzz(code: string): Promise<GameRoomView> {
  const res = await fetch(`${API_URL}/v1/game/rooms/${encodeURIComponent(code)}/buzz`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Не удалось нажать");
  return res.json();
}
