export type AccountMenuKey =
  | "orders"
  | "favorites"
  | "history"
  | "addresses"
  | "security"
  | "notifications"
  | "language"
  | "logout";

export type AccountMenuSection = "account" | "preferences" | "security" | "session";

export type AccountIconName =
  | "orders"
  | "favorites"
  | "history"
  | "addresses"
  | "security"
  | "notifications"
  | "language"
  | "logout";

type AccountMenuItemBase = {
  key: AccountMenuKey;
  label: string;
  icon: AccountIconName;
  section: AccountMenuSection;
  description?: string;
};

export type AccountMenuLinkItem = AccountMenuItemBase & {
  type: "link";
  href: string;
  scaffolded?: boolean;
};

export type AccountMenuActionItem = AccountMenuItemBase & {
  type: "action";
};

export type AccountMenuItem = AccountMenuLinkItem | AccountMenuActionItem;

export type LanguageCode = "fr" | "ar" | "en" | "es";

export const ACCOUNT_LANGUAGE_STORAGE_KEY = "3fj-account-language-v1";
export const RECENTLY_VIEWED_STORAGE_KEY = "3fj-recently-viewed-products-v1";

export const LANGUAGE_OPTIONS: ReadonlyArray<{ code: LanguageCode; label: string }> = [
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

export const DEFAULT_LANGUAGE_CODE: LanguageCode = "fr";

export const ACCOUNT_MENU_ITEMS: ReadonlyArray<AccountMenuItem> = [
  {
    key: "orders",
    label: "Mes commandes",
    icon: "orders",
    section: "account",
    type: "link",
    href: "/compte/commandes",
  },
  {
    key: "favorites",
    label: "Mes favoris",
    icon: "favorites",
    section: "account",
    type: "link",
    href: "/compte/favoris",
  },
  {
    key: "history",
    label: "Historique",
    icon: "history",
    section: "account",
    type: "link",
    href: "/compte/historique",
  },
  {
    key: "addresses",
    label: "Adresses",
    icon: "addresses",
    section: "account",
    type: "link",
    href: "/compte/adresses",
    scaffolded: true,
  },
  {
    key: "security",
    label: "Sécurité",
    icon: "security",
    section: "security",
    type: "link",
    href: "/compte/securite",
    scaffolded: true,
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: "notifications",
    section: "preferences",
    type: "link",
    href: "/compte/notifications",
    scaffolded: true,
  },
  {
    key: "language",
    label: "Langue",
    icon: "language",
    section: "preferences",
    type: "action",
  },
  {
    key: "logout",
    label: "Déconnexion",
    icon: "logout",
    section: "session",
    type: "action",
  },
];

export const MOBILE_ACCOUNT_SECTIONS: ReadonlyArray<{
  title: string;
  keys: AccountMenuKey[];
}> = [
  {
    title: "Compte",
    keys: ["orders", "favorites", "history", "addresses"],
  },
  {
    title: "Préférences",
    keys: ["notifications", "language"],
  },
  {
    title: "Sécurité",
    keys: ["security"],
  },
  {
    title: "Session",
    keys: ["logout"],
  },
];

export const ACCOUNT_SCAFFOLDED_MESSAGES: Partial<Record<AccountMenuKey, string>> = {
  addresses: "La gestion détaillée des adresses est prête côté navigation et sera finalisée prochainement.",
  notifications:
    "Les préférences de notifications sont préparées côté interface, avec branchement API prévu dans une prochaine itération.",
  security:
    "Le panneau de sécurité est prêt côté expérience compte et sera connecté aux prochains flux de mot de passe / sessions.",
};

export const getActiveAccountMenuKey = (pathname: string | null): AccountMenuKey => {
  const normalized = (pathname ?? "").toLowerCase();

  if (normalized.startsWith("/compte/commandes")) {
    return "orders";
  }

  if (normalized.startsWith("/compte/favoris")) {
    return "favorites";
  }

  if (normalized.startsWith("/compte/historique") || normalized === "/compte") {
    return "history";
  }

  if (normalized.startsWith("/compte/adresses")) {
    return "addresses";
  }

  if (normalized.startsWith("/compte/securite")) {
    return "security";
  }

  if (normalized.startsWith("/compte/notifications")) {
    return "notifications";
  }

  return "history";
};

export const getLanguageLabel = (code: LanguageCode): string => {
  return LANGUAGE_OPTIONS.find((language) => language.code === code)?.label ?? "Français";
};

