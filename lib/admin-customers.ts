import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
};

export type AdminCustomerSummary = {
  id: string;
  userId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  accountCreatedAt: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

export type AdminCustomerOrderSummary = {
  id: string;
  total: number;
  status: string;
  createdAt: string;
};

export type AdminCustomerDetail = {
  id: string;
  userId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  accountCreatedAt: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  orders: AdminCustomerOrderSummary[];
};

const coerceNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getSafeUserProfileById = async (
  userId: string,
): Promise<SafeAdminUserProfile> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { email: null, createdAt: null, fullName: null };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      return { email: null, createdAt: null, fullName: null };
    }

    const user = data.user;
    const fullName =
      coerceNonEmptyString(user.user_metadata?.full_name) ??
      coerceNonEmptyString(user.user_metadata?.name);

    return {
      email: user.email ?? null,
      createdAt: user.created_at ?? null,
      fullName,
    };
  } catch {
    return { email: null, createdAt: null, fullName: null };
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
      displayName: safeProfile?.fullName ?? row.customer_name,
      email: safeProfile?.email ?? null,
      phone: row.customer_phone ?? null,
      accountCreatedAt: safeProfile?.createdAt ?? null,
      orderCount: 1,
      totalSpent: row.total,
      lastOrderAt: row.created_at,
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

  const latestOrder = rows[0];
  const orderCount = rows.length;
  const totalSpent = rows.reduce((sum, order) => sum + order.total, 0);

  return {
    id: normalizedUserId,
    userId: normalizedUserId,
    displayName: safeProfile.fullName ?? latestOrder.customer_name,
    email: safeProfile.email,
    phone: latestOrder.customer_phone,
    accountCreatedAt: safeProfile.createdAt,
    orderCount,
    totalSpent,
    lastOrderAt: latestOrder.created_at,
    orders: rows.map((row) => ({
      id: row.id,
      total: row.total,
      status: row.status,
      createdAt: row.created_at,
    })),
  };
};
