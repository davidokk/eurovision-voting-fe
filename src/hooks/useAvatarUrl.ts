import { useEffect, useState } from "react";
import { getStoredAvatarUrl } from "../api/user";

export function useAvatarUrl() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => getStoredAvatarUrl());

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      setAvatarUrl(detail ?? getStoredAvatarUrl());
    };
    window.addEventListener("ev-avatar-updated", onUpdate);
    return () => window.removeEventListener("ev-avatar-updated", onUpdate);
  }, []);

  return avatarUrl;
}
