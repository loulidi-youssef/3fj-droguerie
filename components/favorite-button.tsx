"use client";

import { usePathname } from "next/navigation";
import { useFavorites } from "@/components/favorites-provider";
import { useToast } from "@/components/toast-provider";

type FavoriteButtonProps = {
  productId: string;
  className?: string;
};

export const FavoriteButton = ({ productId, className }: FavoriteButtonProps) => {
  const pathname = usePathname();
  const { showToast } = useToast();
  const { isFavorite, isPending, toggleFavorite } = useFavorites();

  const favorited = isFavorite(productId);
  const pending = isPending(productId);

  const handleToggle = async () => {
    const currentPath =
      typeof window === "undefined"
        ? pathname
        : `${window.location.pathname}${window.location.search}`;
    const result = await toggleFavorite(productId, currentPath);

    if (result.requiresAuth) {
      showToast(result.error ?? "Veuillez vous connecter pour ajouter aux favoris");
      if (result.loginPath) {
        window.setTimeout(() => {
          window.location.href = result.loginPath!;
        }, 700);
      }
      return;
    }

    if (!result.ok) {
      showToast(result.error ?? "Action impossible pour le moment.");
      return;
    }

    showToast(result.isFavorited ? "Ajoute aux favoris." : "Retire des favoris.");
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={
        className ??
        `inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
          favorited
            ? "border-rose-300 bg-rose-50 text-rose-600"
            : "border-slate-300 bg-white text-slate-500 hover:border-rose-300 hover:text-rose-600"
        } disabled:cursor-not-allowed disabled:opacity-70`
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 20.5l-1-.9C6 15 3 12.3 3 8.9A4.4 4.4 0 017.4 4.5c1.8 0 3 .9 4.1 2.2 1.1-1.3 2.3-2.2 4.1-2.2A4.4 4.4 0 0120 8.9c0 3.4-3 6.1-8 10.7l-1 .9z" />
      </svg>
    </button>
  );
};
