const API_URL = import.meta.env.VITE_API_URL || "";

export type FavoritePerformance = {
  PerformanceID: string;
  CountryName: string;
  FlagEmoji: string;
  ContestYear: number;
  ContestType: string;
  Song: string;
  Artist: string;
  YoutubeLink: string;
  Qualified?: boolean;
  Place?: number;
  CreatedAt: string;
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchFavoriteIds(): Promise<string[]> {
  const res = await fetch(`${API_URL}/v1/favorites/ids`, { headers: authHeaders() });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export async function fetchFavoritePerformances(userId: string): Promise<FavoritePerformance[]> {
  const res = await fetch(`${API_URL}/v1/favorites?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export async function addFavorite(performanceId: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/favorites/${encodeURIComponent(performanceId)}`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Не удалось добавить в избранное");
}

export async function removeFavorite(performanceId: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/favorites/${encodeURIComponent(performanceId)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Не удалось убрать из избранного");
}
