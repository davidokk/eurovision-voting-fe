import { useEffect, useRef } from "react";
import { scheduleGamePlaylistPreload } from "../utils/gameYoutubePreload";

export function useGameTrackPreload(links: string[], currentRoundIndex: number, enabled: boolean) {
  const keyRef = useRef("");

  useEffect(() => {
    if (!enabled || links.length === 0) return;
    const key = `${currentRoundIndex}:${links.join("|")}`;
    if (keyRef.current === key) return;
    keyRef.current = key;
    scheduleGamePlaylistPreload(links, currentRoundIndex);
  }, [links, currentRoundIndex, enabled]);
}
