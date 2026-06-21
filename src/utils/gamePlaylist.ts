import type { GameCatalogItem, GamePlaylistEntryInput } from "../types/game";

export function playlistEntriesToCatalog(
  entries: GamePlaylistEntryInput[],
  catalog: GameCatalogItem[]
): { order: string[]; byId: Map<string, GameCatalogItem> } {
  const order: string[] = [];
  const byId = new Map<string, GameCatalogItem>();

  for (const entry of entries) {
    const id = entry.performance_id?.trim();
    if (!id) continue;
    order.push(id);
    const known = catalog.find((c) => c.performance_id === id);
    if (known) {
      byId.set(id, known);
      continue;
    }
    byId.set(id, {
      performance_id: id,
      artist: entry.artist?.trim() || "YouTube",
      song: entry.song?.trim() || "Трек",
      country_name: "",
      flag_emoji: "🎬",
      year: 0,
      contest_type: "youtube",
      youtube_link: entry.youtube_link?.trim() || "",
      custom: true,
    });
  }

  return { order, byId };
}

export function catalogToPlaylistEntries(
  order: string[],
  byId: Map<string, GameCatalogItem>
): GamePlaylistEntryInput[] {
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
  return entries;
}

export function isCatalogPerformanceId(id?: string | null): boolean {
  if (!id) return false;
  return !id.startsWith("yt:");
}
