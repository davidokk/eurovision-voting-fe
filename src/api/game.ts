import type { GameCatalogItem, GamePlaylistEntryInput, GameRoomView, SavedPlaylist, SavedPlaylistSummary } from "../types/game";

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

export async function gameSubmitAnswer(code: string, answer: string): Promise<GameRoomView> {
  const res = await fetch(`${API_URL}/v1/game/rooms/${encodeURIComponent(code)}/answer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Не удалось отправить ответ");
  }
  return res.json();
}

export type YouTubeSearchItem = {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails?: { medium?: { url: string }; default?: { url: string } };
  };
};

export async function searchYouTubeVideos(query: string, maxResults = 8): Promise<YouTubeSearchItem[]> {
  const params = new URLSearchParams({ q: query.trim(), maxResults: String(maxResults) });
  const res = await fetch(`${API_URL}/v1/proxy/youtube/search?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

export function buildPlaylistPayload(
  order: string[],
  byId: Map<string, GameCatalogItem>
): { entries: GamePlaylistEntryInput[] } {
  const entries: GamePlaylistEntryInput[] = [];
  for (const id of order) {
    const item = byId.get(id);
    if (!item) continue;
    entries.push({
      performance_id: item.performance_id,
      artist: item.artist,
      song: item.song,
      youtube_link: item.youtube_link,
    });
  }
  return { entries };
}

export async function fetchSavedPlaylists(): Promise<SavedPlaylistSummary[]> {
  const res = await fetch(`${API_URL}/v1/game/playlists`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Не удалось загрузить плейлисты");
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export async function fetchSavedPlaylist(id: string): Promise<SavedPlaylist> {
  const res = await fetch(`${API_URL}/v1/game/playlists/${encodeURIComponent(id)}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Плейлист не найден");
  return res.json();
}

export async function createSavedPlaylist(name: string, entries: GamePlaylistEntryInput[]): Promise<SavedPlaylist> {
  const res = await fetch(`${API_URL}/v1/game/playlists`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, entries }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Не удалось сохранить плейлист");
  }
  return res.json();
}

export async function updateSavedPlaylist(
  id: string,
  name: string,
  entries: GamePlaylistEntryInput[]
): Promise<SavedPlaylist> {
  const res = await fetch(`${API_URL}/v1/game/playlists/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ name, entries }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Не удалось обновить плейлист");
  }
  return res.json();
}

export async function deleteSavedPlaylist(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/game/playlists/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Не удалось удалить плейлист");
}
