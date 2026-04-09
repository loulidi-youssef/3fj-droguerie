import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOptionalProductImageReference } from "@/lib/product-image-variants";

type CustomerOrderRow = {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  created_at: string;
};

type SafeAdminUserProfile = {
  email: string | null;
  createdAt: string | null;
  fullName: string | null;
  isSuspended: boolean;
};

export type AdminCustomerAccountStatus = "guest" | "active" | "suspended";

export type AdminCustomerSummary = {
  id: string;
  userId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  accountCreatedAt: string | null;
  accountStatus: AdminCustomerAccountStatus;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  latestOrderStatus: string | null;
};

export type AdminCustomerOrderSummary = {
  id: string;
  total: number;
  status: string;
  createdAt: string;
};

export type AdminCustomerFavoriteSummary = {
  productId: string;
  productName: string;
  productSlug: string;
  price: number | null;
  image: string | null;
  createdAt: string;
};

export type AdminCustomerDetail = {
  id: string;
  userId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  accountCreatedAt: string | null;
  accountStatus: AdminCustomerAccountStatus;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  latestOrderStatus: string | null;
  orders: AdminCustomerOrderSummary[];
  favorites: AdminCustomerFavoriteSummary[];
};

type AdminCustomerActionResult = {
  ok: boolean;
  error?: string;
};

type FavoriteRow = {
  product_id: string;
  created_at: string;
  products:
    | {
        name: string;
        slug: string;
        price: number;
        images: string[] | null;
      }
    | Array<{
        name: string;
        slug: string;
        price: number;
        images: string[] | null;
      }>
    | null;
};

const coerceNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isSuspendedFromBannedUntil = (bannedUntil: string | undefined): boolean => {
  if (!bannedUntil) {
    return false;
  }

  const bannedUntilDate = new Date(bannedUntil);
  if (Number.isNaN(bannedUntilDate.getTime())) {
    return false;
  }

  return bannedUntilDate.getTime() > Date.now();
};

const getSafeUserProfileById = async (
  userId: string,
): Promise<SafeAdminUserProfile> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { email: null, createdAt: null, fullName: null, isSuspended: false };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      return { email: null, createdAt: null, fullName: null, isSuspended: false };
    }

    const user = data.user;
    const fullName =
      coerceNonEmptyString(user.user_metadata?.full_name) ??
      coerceNonEmptyString(user.user_metadata?.name);

    return {
      email: user.email ?? null,
      createdAt: user.created_at ?? null,
      fullName,
      isSuspended: isSuspendedFromBannedUntil(user.banned_until),
    };
  } catch {
    return { email: null, createdAt: null, fullName: null, isSuspended: false };
  }
};

export const getAdminCustomers = async (): Promise<AdminCustomerSummary[]> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, customer_name, customer_phone, total, status, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const rows = data as CustomerOrderRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[];

  const safeProfiles = await Promise.all(
    userIds.map(async (userId) => [userId, await getSafeUserProfileById(userId)] as const),
  );
  const profileByUserId = new Map(safeProfiles);

  const customerByKey = new Map<string, AdminCustomerSummary>();

  for (const row of rows) {
    const key = row.user_id
      ? `user:${row.user_id}`
      : `guest:${row.customer_phone.toLowerCase()}:${row.customer_name.toLowerCase()}`;
    const safeProfile = row.user_id ? profileByUserId.get(row.user_id) : undefined;

    const existing = customerByKey.get(key);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += row.total;

      if (!existing.lastOrderAt || new Date(row.created_at) > new Date(existing.lastOrderAt)) {
        existing.lastOrderAt = row.created_at;
        existing.latestOrderStatus = row.status;
      }

      if (!existing.phone) {
        existing.phone = row.customer_phone;
      }

      if (!existing.displayName && row.customer_name) {
        existing.displayName = row.customer_name;
      }

      continue;
    }

    customerByKey.set(key, {
      id: row.user_id ?? key,
      userId: row.user_id,
      displayName: safeProfile?.fullName ?? row.customer_name ?? "Client",
      email: safeProfile?.email ?? null,
      phone: row.customer_phone ?? null,
      accountCreatedAt: safeProfile?.createdAt ?? null,
      accountStatus: row.user_id
        ? safeProfile?.isSuspended
          ? "suspended"
          : "active"
        : "guest",
      orderCount: 1,
      totalSpent: row.total,
      lastOrderAt: row.created_at,
      latestOrderStatus: row.status,
    });
  }

  return [...customerByKey.values()].sort((first, second) => {
    if (!first.lastOrderAt && !second.lastOrderAt) {
      return first.displayName.localeCompare(second.displayName);
    }

    if (!first.lastOrderAt) {
      return 1;
    }

    if (!second.lastOrderAt) {
      return -1;
    }

    return new Date(second.lastOrderAt).getTime() - new Date(first.lastOrderAt).getTime();
  });
};

export const getAdminCustomerDetail = async (
  userId: string,
): Promise<AdminCustomerDetail | null> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return null;
  }

  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, customer_name, customer_phone, total, status, created_at")
    .eq("user_id", normalizedUserId)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return null;
  }

  const rows = data as CustomerOrderRow[];
  const safeProfile = await getSafeUserProfileById(normalizedUserId);

  const favoritesResult = await supabaseAdmin
    .from("favorites")
    .select("product_id, created_at, products(name, slug, price, images)")
    .eq("user_id", normalizedUserId)
    .order("created_at", { ascending: false })
    .limit(12);

  const favorites: AdminCustomerFavoriteSummary[] = !favoritesResult.error && favoritesResult.data
    ? (favoritesResult.data as FavoriteRow[]).map((row) => {
        const productsValue = Array.isArray(row.products)
          ? row.products[0] ?? null
          : row.products;

        return {
          productId: row.product_id,
          productName: productsValue?.name ?? "Produit",
          productSlug: productsValue?.slug ?? "",
          price: typeof productsValue?.price === "number" ? productsValue.price : null,
          image: resolveOptionalProductImageReference(
            Array.isArray(productsValue?.images) && productsValue.images.length > 0
              ? productsValue.images[0] ?? null
              : null,
          ),
          createdAt: row.created_at,
        };
      })
    : [];

  const latestOrder = rows[0];
  const orderCount = rows.length;
  const totalSpent = rows.reduce((sum, order) => sum + order.total, 0);

  return {
    id: normalizedUserId,
    userId: normalizedUserId,
    displayName: safeProfile.fullName ?? latestOrder.customer_name ?? "Client",
    email: safeProfile.email,
    phone: latestOrder.customer_phone,
    accountCreatedAt: safeProfile.createdAt,
    accountStatus: safeProfile.isSuspended ? "suspended" : "active",
    orderCount,
    totalSpent,
    lastOrderAt: latestOrder.created_at,
    latestOrderStatus: latestOrder.status,
    orders: rows.map((row) => ({
      id: row.id,
      total: row.total,
      status: row.status,
      createdAt: row.created_at,
    })),
    favorites,
  };
};

export const setAdminCustomerSuspended = async (
  userId: string,
  suspended: boolean,
): Promise<AdminCustomerActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { ok: false, error: "Client introuvable." };
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(normalizedUserId, {
    ban_duration: suspended ? "876000h" : "none",
  });

  if (error) {
    return { ok: false, error: "Impossible de mettre a jour le statut du compte." };
  }

  return { ok: true };
};

export const deleteAdminCustomerAccount = async (
  userId: string,
): Promise<AdminCustomerActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { ok: false, error: "Client introuvable." };
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(normalizedUserId, true);
  if (error) {
    return { ok: false, error: "Suppression impossible pour ce compte." };
  }

  return { ok: true };
};
