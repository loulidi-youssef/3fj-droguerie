import { blogPosts as fallbackBlogPosts } from "@/data/blog-posts";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/types";

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_path: string;
  is_published: boolean;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
};

const BLOG_POST_SELECT =
  "id, slug, title, excerpt, content, cover_image_path, is_published, published_at, seo_title, seo_description, created_at";

const estimateReadTime = (contentText: string): string => {
  const words = contentText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min`;
};

const toParagraphs = (contentText: string): string[] => {
  return contentText
    .split(/\r?\n\r?\n|\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
};

const toPublishedDate = (publishedAt: string | null, createdAt: string): string => {
  const date = new Date(publishedAt ?? createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

const mapBlogPostRow = (row: BlogPostRow): BlogPost => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  excerpt: row.excerpt,
  image: row.cover_image_path,
  publishedAt: toPublishedDate(row.published_at, row.created_at),
  readTime: estimateReadTime(row.content),
  content: toParagraphs(row.content),
  seoDescription: row.seo_description ?? row.excerpt,
  seoTitle: row.seo_title ?? undefined,
  isPublished: row.is_published,
  createdAt: row.created_at,
});

const getFallbackPublishedBlogPosts = (): BlogPost[] => {
  return [...fallbackBlogPosts].sort((first, second) =>
    second.publishedAt.localeCompare(first.publishedAt),
  );
};

export const getPublishedBlogPosts = async (): Promise<BlogPost[]> => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getFallbackPublishedBlogPosts();
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT)
    .eq("is_published", true)
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return getFallbackPublishedBlogPosts();
  }

  return (data as BlogPostRow[]).map(mapBlogPostRow);
};

export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | undefined> => {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) {
    return undefined;
  }

  const supabase = getSupabaseServerClient();

  if (supabase) {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(BLOG_POST_SELECT)
      .eq("slug", trimmedSlug)
      .eq("is_published", true)
      .or(`published_at.is.null,published_at.lte.${nowIso}`)
      .maybeSingle();

    if (!error && data) {
      return mapBlogPostRow(data as BlogPostRow);
    }
  }

  return getFallbackPublishedBlogPosts().find((post) => post.slug === trimmedSlug);
};
