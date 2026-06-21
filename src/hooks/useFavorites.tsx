import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addFavorite, fetchFavoriteIds, removeFavorite } from "../api/favorites";

type FavoritesContextValue = {
  ready: boolean;
  isFavorite: (performanceId: string | undefined | null) => boolean;
  toggleFavorite: (performanceId: string) => Promise<boolean>;
  favoriteIds: Set<string>;
  refreshFavorites: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  const refreshFavorites = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setFavoriteIds(new Set());
      setReady(true);
      return;
    }
    const ids = await fetchFavoriteIds();
    setFavoriteIds(new Set(ids));
    setReady(true);
  }, []);

  useEffect(() => {
    void refreshFavorites();
    const onAuth = () => void refreshFavorites();
    window.addEventListener("ev-auth-updated", onAuth);
    return () => window.removeEventListener("ev-auth-updated", onAuth);
  }, [refreshFavorites]);

  const isFavorite = useCallback(
    (performanceId: string | undefined | null) => {
      if (!performanceId) return false;
      return favoriteIds.has(performanceId);
    },
    [favoriteIds]
  );

  const toggleFavorite = useCallback(async (performanceId: string) => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("not authenticated");

    const wasFavorite = favoriteIds.has(performanceId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(performanceId);
      else next.add(performanceId);
      return next;
    });

    try {
      if (wasFavorite) await removeFavorite(performanceId);
      else await addFavorite(performanceId);
      return !wasFavorite;
    } catch (err) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(performanceId);
        else next.delete(performanceId);
        return next;
      });
      throw err;
    }
  }, [favoriteIds]);

  const value = useMemo(
    () => ({ ready, isFavorite, toggleFavorite, favoriteIds, refreshFavorites }),
    [ready, isFavorite, toggleFavorite, favoriteIds, refreshFavorites]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}

export function useFavoritesOptional() {
  return useContext(FavoritesContext);
}
