import type { GamePlayer, GameRoomState, GameRoomView, GameRoundMode, GameRoundView } from "../types/game";

const ROOM_CACHE_KEY = "gts_room_cache";

export function isValidRoom(r: unknown): r is GameRoomView {
  if (!r || typeof r !== "object") return false;
  const room = r as GameRoomView;
  return typeof room.code === "string" && room.code.length > 0 && typeof room.state === "string";
}

export function isActiveRoundState(state: GameRoomState | string | undefined): boolean {
  return (
    state === "round_countdown" ||
    state === "round_playing" ||
    state === "round_buzzed" ||
    state === "round_waiting_reveal" ||
    state === "round_reveal" ||
    state === "round_clip"
  );
}

function roundModeForState(state: GameRoomState | string): GameRoundMode {
  switch (state) {
    case "round_reveal":
      return "video";
    case "round_clip":
      return "video_full";
    case "round_countdown":
    case "round_buzzed":
    case "round_waiting_reveal":
      return "silent";
    case "round_playing":
      return "audio";
    default:
      return "silent";
  }
}

function stateRank(state: string): number {
  switch (state) {
    case "lobby":
      return 0;
    case "round_countdown":
    case "round_playing":
      return 1;
    case "round_buzzed":
    case "round_waiting_reveal":
      return 2;
    case "round_reveal":
      return 3;
    case "round_clip":
      return 4;
    case "finished":
      return 5;
    default:
      return -1;
  }
}

function shouldAcceptRoomState(prev: GameRoomView, next: GameRoomView): boolean {
  if (prev.code !== next.code) return true;
  if (prev.state === next.state) return true;

  if (next.state === "finished") return true;

  if (
    (prev.state === "round_reveal" || prev.state === "round_clip") &&
    next.state === "round_playing" &&
    next.current_round > prev.current_round
  ) {
    return true;
  }

  if (next.state === "round_playing") {
    if (prev.state === "round_waiting_reveal" || prev.state === "round_buzzed") return false;
    if (
      (prev.state === "round_reveal" || prev.state === "round_clip") &&
      next.current_round <= prev.current_round
    ) {
      return false;
    }
  }

  if (prev.current_round === next.current_round) {
    return stateRank(next.state) >= stateRank(prev.state);
  }

  return true;
}

function mergePlayerScores(prev: GamePlayer[], next: GamePlayer[]): GamePlayer[] {
  if (!next.length) return prev;
  const byId = new Map(prev.map((p) => [p.user_id, { ...p }]));
  for (const p of next) {
    const old = byId.get(p.user_id);
    if (!old) {
      byId.set(p.user_id, { ...p });
      continue;
    }
    byId.set(p.user_id, {
      ...old,
      ...p,
      score: Math.max(old.score, p.score),
    });
  }
  return [...byId.values()];
}

function preserveRound(prev: GameRoomView, next: GameRoomView): GameRoundView | undefined {
  const pausedRound =
    next.state === "round_waiting_reveal" || next.state === "round_buzzed";

  if (pausedRound && prev.round) {
    const hasHostHint = !!(next.round?.artist || next.round?.song);
    return {
      ...prev.round,
      ...next.round,
      youtube_link: next.round?.youtube_link || prev.round.youtube_link,
      performance_id: next.round?.performance_id || prev.round.performance_id,
      video_start_sec: next.round?.video_start_sec ?? prev.round.video_start_sec,
      mode: "silent",
      round_ends_at: undefined,
      artist: hasHostHint ? (next.round?.artist ?? prev.round.artist) : undefined,
      song: hasHostHint ? (next.round?.song ?? prev.round.song) : undefined,
      country_name: hasHostHint ? (next.round?.country_name ?? prev.round.country_name) : undefined,
      flag_emoji: hasHostHint ? (next.round?.flag_emoji ?? prev.round.flag_emoji) : undefined,
      year: hasHostHint ? (next.round?.year ?? prev.round.year) : undefined,
      contest_type: hasHostHint ? (next.round?.contest_type ?? prev.round.contest_type) : undefined,
      contest_scores: undefined,
    };
  }

  if (next.round?.youtube_link) {
    if (next.current_round !== prev.current_round) {
      return {
        ...next.round,
        video_start_sec: next.round.video_start_sec || 45,
      };
    }
    if (next.state === "round_reveal" || next.state === "round_clip") {
      return {
        ...next.round,
        video_start_sec: next.round.video_start_sec ?? prev.round?.video_start_sec,
        mode: roundModeForState(next.state),
      };
    }
    if (next.state === "round_playing" || next.state === "round_countdown") {
      return {
        ...next.round,
        video_start_sec: next.round.video_start_sec ?? prev.round?.video_start_sec,
        round_ends_at: next.round.round_ends_at,
      };
    }
    return next.round;
  }
  if (!prev.round || !isActiveRoundState(next.state)) return next.round;

  if (next.current_round !== prev.current_round) {
    return next.round;
  }

  const revealed = next.state === "round_reveal" || next.state === "round_clip";
  return {
    ...prev.round,
    ...next.round,
    youtube_link: next.round?.youtube_link || prev.round.youtube_link,
    video_start_sec: next.round?.video_start_sec ?? prev.round.video_start_sec,
    mode: roundModeForState(next.state),
    round_ends_at: next.state === "round_playing" ? next.round?.round_ends_at : undefined,
    artist: revealed ? next.round?.artist ?? prev.round.artist : undefined,
    song: revealed ? next.round?.song ?? prev.round.song : undefined,
    country_name: revealed ? next.round?.country_name ?? prev.round.country_name : undefined,
    flag_emoji: revealed ? next.round?.flag_emoji ?? prev.round.flag_emoji : undefined,
    year: revealed ? next.round?.year ?? prev.round.year : undefined,
    contest_scores: next.round?.contest_scores ?? (revealed ? prev.round.contest_scores : undefined),
  };
}

export function mergeGameRoom(prev: GameRoomView | null, next: GameRoomView): GameRoomView {
  if (!prev || prev.code !== next.code) {
    return {
      ...next,
      players: next.players?.length ? next.players : [],
      round_duration_sec: next.round_duration_sec ?? 10,
    };
  }

  let merged: GameRoomView = { ...next };

  if (!shouldAcceptRoomState(prev, next)) {
    merged = {
      ...merged,
      state: prev.state,
      buzzed_user_id: prev.buzzed_user_id,
      buzzed_username: prev.buzzed_username,
      current_round: prev.current_round,
      last_judgement: prev.last_judgement ?? next.last_judgement,
      players: mergePlayerScores(prev.players ?? [], merged.players ?? []),
    };
  }

  const round = preserveRound(prev, merged);
  if (round) {
    merged = { ...merged, round };
  }

  if (!merged.players?.length && prev.players?.length) {
    merged = { ...merged, players: prev.players };
  }

  if (!merged.round_duration_sec) {
    merged = { ...merged, round_duration_sec: prev.round_duration_sec ?? 10 };
  }

  return merged;
}

export function cacheGameRoom(room: GameRoomView) {
  try {
    sessionStorage.setItem(ROOM_CACHE_KEY, JSON.stringify(room));
  } catch {
    // ignore quota / private mode
  }
}

export function loadCachedGameRoom(code: string): GameRoomView | null {
  try {
    const raw = sessionStorage.getItem(ROOM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (isValidRoom(parsed) && parsed.code === code) return parsed;
  } catch {
    // ignore
  }
  return null;
}
