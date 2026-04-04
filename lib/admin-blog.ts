import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_path: string;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertAdminBlogPostInput = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImagePath: string;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  publishedAt: string | null;
};

type AdminActionResult = {
  ok: boolean;
  error?: string;
};

const toBlogPostId = (slug: string, title: string): string => {
  const source = slug.trim() || title.trim();
  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || `blog-${Date.now()}`;
};

const normalizeDatabaseError = (
  message: string | undefined,
  fallbackMessage: string,
): string => {
  if (!message) {
    return fallbackMessage;
  }

  if (message.includes("duplicate key value")) {
    return "Ce slug existe deja. Choisissez un slug unique.";
  }

  if (message.includes("relation \"blog_posts\" does not exist")) {
    return "La table blog_posts est manquante. Lancez supabase/migrations/2026-04-04-create-blog-and-reviews-tables.sql.";
  }

  return fallbackMessage;
};

const resolvePublishedAt = (
  isPublished: boolean,
  publishedAt: string | null,
): string | null => {
  if (!isPublished) {
    return null;
  }

  return publishedAt ?? new Date().toISOString();
};

export const getAdminBlogPosts = async (): Promise<AdminBlogPost[]> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as AdminBlogPost[];
};

export const createAdminBlogPost = async (
  input: UpsertAdminBlogPostInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const id = input.id?.trim() || toBlogPostId(input.slug, input.title);
  const { error } = await supabaseAdmin.from("blog_posts").insert({
    id,
    slug: input.slug.trim(),
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    content: input.content.trim(),
    cover_image_path: input.coverImagePath.trim(),
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    is_published: input.isPublished,
    published_at: resolvePublishedAt(input.isPublished, input.publishedAt),
  });

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible d'ajouter l'article."),
    };
  }

  return { ok: true };
};

export const updateAdminBlogPost = async (
  id: string,
  input: UpsertAdminBlogPostInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("blog_posts")
    .update({
      slug: input.slug.trim(),
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      content: input.content.trim(),
      cover_image_path: input.coverImagePath.trim(),
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      is_published: input.isPublished,
      published_at: resolvePublishedAt(input.isPublished, input.publishedAt),
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible de modifier l'article."),
    };
  }

  return { ok: true };
};

export const setAdminBlogPostPublishedState = async (
  id: string,
  isPublished: boolean,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("blog_posts")
    .update({
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Impossible de changer le statut de publication." };
  }

  return { ok: true };
};

export const deleteAdminBlogPost = async (id: string): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Suppression impossible pour le moment." };
  }

  return { ok: true };
};
