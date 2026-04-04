"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type FavoriteActionResult = {
  ok: boolean;
  requiresAuth?: boolean;
  isFavorited?: boolean;
  error?: string;
};

type FavoritesContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  favoriteIds: string[];
  pendingIds: string[];
  isFavorite: (productId: string) => boolean;
  isPending: (productId: string) => boolean;
  refreshFavorites: () => Promise<void>;
  toggleFavorite: (productId: string, redirectPath?: string) => Promise<FavoriteActionResult>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const toSet = (values: string[]): Set<string> => new Set(values);

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const fetchFavoriteIds = async (token: string): Promise<string[]> => {
    const response = await fetch("/api/account/favorites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json()) as {
      favoriteProductIds?: string[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Impossible de recuperer vos favoris.");
    }

    return payload.favoriteProductIds ?? [];
  };

  const refreshFavorites = async (): Promise<void> => {
    if (!isAuthenticated || !accessToken) {
      setFavoriteIds([]);
      return;
    }

    try {
      const ids = await fetchFavoriteIds(accessToken);
      setFavoriteIds(ids);
    } catch {
      setFavoriteIds([]);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setIsReady(true);
      setIsAuthenticated(false);
      setAccessToken(null);
      setFavoriteIds([]);
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      const session = data.session;
      setIsAuthenticated(Boolean(session));
      setAccessToken(session?.access_token ?? null);

      if (session?.access_token) {
        try {
          const ids = await fetchFavoriteIds(session.access_token);
          if (!isMounted) {
            return;
          }
          setFavoriteIds(ids);
        } catch {
          if (!isMounted) {
            return;
          }
          setFavoriteIds([]);
        }
      } else {
        setFavoriteIds([]);
      }

      setIsReady(true);
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(Boolean(session));
      setAccessToken(session?.access_token ?? null);
      setPendingIds([]);

      if (session?.access_token) {
        try {
          const ids = await fetchFavoriteIds(session.access_token);
          setFavoriteIds(ids);
        } catch {
          setFavoriteIds([]);
        }
      } else {
        setFavoriteIds([]);
      }

      setIsReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const toggleFavorite = async (
    productId: string,
    redirectPath = "/produits",
  ): Promise<FavoriteActionResult> => {
    if (!isAuthenticated || !accessToken) {
      const loginPath = `/login?next=${encodeURIComponent(redirectPath)}`;
      window.location.href = loginPath;
      return { ok: false, requiresAuth: true };
    }

    const trimmedProductId = productId.trim();
    if (!trimmedProductId) {
      return { ok: false, error: "Produit introuvable." };
    }

    const currentlyFavorited = toSet(favoriteIds).has(trimmedProductId);
    setPendingIds((current) => Array.from(new Set([...current, trimmedProductId])));

    if (currentlyFavorited) {
      setFavoriteIds((current) => current.filter((id) => id !== trimmedProductId));
    } else {
      setFavoriteIds((current) =>
        current.includes(trimmedProductId) ? current : [trimmedProductId, ...current],
      );
    }

    try {
      const response = await fetch(`/api/account/favorites/${trimmedProductId}`, {
        method: currentlyFavorited ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible de mettre a jour les favoris.");
      }

      return { ok: true, isFavorited: !currentlyFavorited };
    } catch (error) {
      setFavoriteIds((current) => {
        if (currentlyFavorited) {
          return current.includes(trimmedProductId)
            ? current
            : [trimmedProductId, ...current];
        }

        return current.filter((id) => id !== trimmedProductId);
      });

      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible de mettre a jour les favoris.",
      };
    } finally {
      setPendingIds((current) => current.filter((id) => id !== trimmedProductId));
    }
  };

  const value: FavoritesContextValue = {
    isReady,
    isAuthenticated,
    favoriteIds,
    pendingIds,
    isFavorite: (productId: string) => favoriteIds.includes(productId),
    isPending: (productId: string) => pendingIds.includes(productId),
    refreshFavorites,
    toggleFavorite,
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = (): FavoritesContextValue => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites doit etre utilise dans FavoritesProvider.");
  }

  return context;
};
