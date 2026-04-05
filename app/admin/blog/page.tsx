import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  getAdminBlogPosts,
  setAdminBlogPostPublishedState,
  updateAdminBlogPost,
} from "@/lib/admin-blog";

type AdminBlogPageProps = {
  searchParams: {
    success?: string | string[];
    error?: string | string[];
  };
};

type BlogPostFormValue = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImagePath: string;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  publishedAt: string | null;
};

type ParsedBlogPostForm =
  | {
      ok: true;
      value: BlogPostFormValue;
    }
  | {
      ok: false;
      error: string;
    };

const toSingleValue = (value: string | string[] | undefined): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return "";
};

const toNullableString = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeSlug = (rawSlug: string): string => {
  return rawSlug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
};

const parseDateTimeInput = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const toDateTimeLocalInputValue = (value: string | null): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "Non defini";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Non defini";
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const parseBlogPostForm = (formData: FormData): ParsedBlogPostForm => {
  const titleRaw = formData.get("title");
  const slugRaw = formData.get("slug");
  const excerptRaw = formData.get("excerpt");
  const contentRaw = formData.get("content");
  const coverImagePathRaw = formData.get("coverImagePath");
  const seoTitle = toNullableString(formData.get("seoTitle"));
  const seoDescription = toNullableString(formData.get("seoDescription"));

  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  const slug = typeof slugRaw === "string" ? normalizeSlug(slugRaw) : "";
  const excerpt = typeof excerptRaw === "string" ? excerptRaw.trim() : "";
  const content = typeof contentRaw === "string" ? contentRaw.trim() : "";
  const coverImagePath =
    typeof coverImagePathRaw === "string" ? coverImagePathRaw.trim() : "";
  const isPublished = formData.get("isPublished") === "on";
  const publishedAtInput = toNullableString(formData.get("publishedAt"));
  const publishedAt = parseDateTimeInput(publishedAtInput);

  if (!title) {
    return { ok: false, error: "Le titre est obligatoire." };
  }

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return {
      ok: false,
      error: "Slug invalide. Utilisez lettres minuscules, chiffres et tirets.",
    };
  }

  if (!excerpt) {
    return { ok: false, error: "L'extrait est obligatoire." };
  }

  if (!content) {
    return { ok: false, error: "Le contenu est obligatoire." };
  }

  if (!coverImagePath) {
    return { ok: false, error: "Le chemin de l'image de couverture est obligatoire." };
  }

  if (publishedAtInput && !publishedAt) {
    return { ok: false, error: "La date de publication est invalide." };
  }

  return {
    ok: true,
    value: {
      title,
      slug,
      excerpt,
      content,
      coverImagePath,
      seoTitle,
      seoDescription,
      isPublished,
      publishedAt,
    },
  };
};

const redirectWithSuccess = (message: string): never => {
  redirect(`/admin/blog?success=${encodeURIComponent(message)}`);
};

const redirectWithError = (message: string): never => {
  redirect(`/admin/blog?error=${encodeURIComponent(message)}`);
};

const getValidatedBlogPostInput = (formData: FormData): BlogPostFormValue => {
  const parsed = parseBlogPostForm(formData);
  if (parsed.ok) {
    return parsed.value;
  }

  return redirectWithError(parsed.error);
};

const logoutAdminAction = async () => {
  "use server";
  await clearAdminSession();
  redirect("/admin/login");
};

const createBlogPostAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const validInput = getValidatedBlogPostInput(formData);
  const created = await createAdminBlogPost(validInput);
  if (!created.ok) {
    redirectWithError(created.error ?? "Impossible d'ajouter l'article.");
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  redirectWithSuccess("Article ajoute avec succes.");
};

const updateBlogPostAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const blogPostIdRaw = formData.get("blogPostId");
  const blogPostId = typeof blogPostIdRaw === "string" ? blogPostIdRaw.trim() : "";
  if (!blogPostId) {
    redirectWithError("Article introuvable.");
  }

  const validInput = getValidatedBlogPostInput(formData);
  const updated = await updateAdminBlogPost(blogPostId, validInput);
  if (!updated.ok) {
    redirectWithError(updated.error ?? "Impossible de modifier l'article.");
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  redirectWithSuccess("Article modifie avec succes.");
};

const toggleBlogPostPublishedAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const blogPostIdRaw = formData.get("blogPostId");
  const nextPublishedRaw = formData.get("nextPublished");

  const blogPostId = typeof blogPostIdRaw === "string" ? blogPostIdRaw.trim() : "";
  const nextPublished = nextPublishedRaw === "true";

  if (!blogPostId) {
    redirectWithError("Article introuvable.");
  }

  const updated = await setAdminBlogPostPublishedState(blogPostId, nextPublished);
  if (!updated.ok) {
    redirectWithError(
      updated.error ?? "Impossible de changer le statut de publication.",
    );
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  redirectWithSuccess(nextPublished ? "Article publie." : "Article depublie.");
};

const deleteBlogPostAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const blogPostIdRaw = formData.get("blogPostId");
  const blogPostId = typeof blogPostIdRaw === "string" ? blogPostIdRaw.trim() : "";
  if (!blogPostId) {
    redirectWithError("Article introuvable.");
  }

  const deleted = await deleteAdminBlogPost(blogPostId);
  if (!deleted.ok) {
    redirectWithError(deleted.error ?? "Suppression impossible.");
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  redirectWithSuccess("Article supprime.");
};

export default async function AdminBlogPage({ searchParams }: AdminBlogPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin blog</h1>
          <p className="mt-3 text-sm text-slate-700">
            Configurez la variable
            <span className="font-semibold"> ADMIN_ACCESS_PASSWORD </span>
            dans
            <span className="font-semibold"> .env.local</span>, puis redemarrez le serveur.
          </p>
        </div>
      </section>
    );
  }

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const blogPosts = await getAdminBlogPosts();
  const successMessage = decodeURIComponent(toSingleValue(searchParams.success) || "");
  const errorMessage = decodeURIComponent(toSingleValue(searchParams.error) || "");

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin blog</h1>
            <p className="mt-1 text-sm text-slate-600">
              Ajoutez, modifiez, publiez ou supprimez les articles du blog.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Commandes
            </Link>
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Produits
            </Link>
            <Link
              href="/admin/customers"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Clients
            </Link>
            <Link
              href="/admin/offres"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Offres
            </Link>
            <Link
              href="/admin/reviews"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Avis
            </Link>
            <form action={logoutAdminAction}>
              <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Deconnexion
              </button>
            </form>
          </div>
        </div>

        {successMessage ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <details className="mb-6 rounded-2xl bg-white p-5 shadow-card" open>
          <summary className="cursor-pointer list-none text-lg font-bold text-brand-blue">
            Ajouter un article
          </summary>

          <form action={createBlogPostAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Titre
              </span>
              <input
                type="text"
                name="title"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Slug
              </span>
              <input
                type="text"
                name="slug"
                required
                placeholder="ex: mon-article-blog"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Extrait
              </span>
              <textarea
                name="excerpt"
                rows={2}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Contenu
              </span>
              <textarea
                name="content"
                rows={6}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Image de couverture
              </span>
              <input
                type="text"
                name="coverImagePath"
                required
                placeholder="/images/blog/blog-mon-article.svg"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                SEO title (optionnel)
              </span>
              <input
                type="text"
                name="seoTitle"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                SEO description (optionnel)
              </span>
              <input
                type="text"
                name="seoDescription"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Date publication (optionnel)
              </span>
              <input
                type="datetime-local"
                name="publishedAt"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="isPublished" defaultChecked />
              <span className="text-sm text-slate-700">Publie</span>
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
              >
                Ajouter article
              </button>
            </div>
          </form>
        </details>

        {blogPosts.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">Aucun article dans Supabase.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {blogPosts.map((post) => (
              <details key={post.id} className="rounded-2xl bg-white p-5 shadow-card">
                <summary className="cursor-pointer list-none">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Titre
                      </p>
                      <p className="text-sm font-bold text-brand-blue">{post.title}</p>
                      <p className="text-xs text-slate-600">Slug: {post.slug}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Statut
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          post.is_published
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {post.is_published ? "Publie" : "Brouillon"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date publication
                      </p>
                      <p className="text-xs text-slate-700">{formatDateTime(post.published_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        MAJ
                      </p>
                      <p className="text-xs text-slate-700">{formatDateTime(post.updated_at)}</p>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500">ID: {post.id}</p>

                  <form action={updateBlogPostAction} className="mt-3 grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="blogPostId" value={post.id} />

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Titre
                      </span>
                      <input
                        type="text"
                        name="title"
                        required
                        defaultValue={post.title}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Slug
                      </span>
                      <input
                        type="text"
                        name="slug"
                        required
                        defaultValue={post.slug}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Extrait
                      </span>
                      <textarea
                        name="excerpt"
                        rows={2}
                        required
                        defaultValue={post.excerpt}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Contenu
                      </span>
                      <textarea
                        name="content"
                        rows={6}
                        required
                        defaultValue={post.content}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Image de couverture
                      </span>
                      <input
                        type="text"
                        name="coverImagePath"
                        required
                        defaultValue={post.cover_image_path}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        SEO title (optionnel)
                      </span>
                      <input
                        type="text"
                        name="seoTitle"
                        defaultValue={post.seo_title ?? ""}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        SEO description (optionnel)
                      </span>
                      <input
                        type="text"
                        name="seoDescription"
                        defaultValue={post.seo_description ?? ""}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Date publication (optionnel)
                      </span>
                      <input
                        type="datetime-local"
                        name="publishedAt"
                        defaultValue={toDateTimeLocalInputValue(post.published_at)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isPublished"
                        defaultChecked={post.is_published}
                      />
                      <span className="text-sm text-slate-700">Publie</span>
                    </label>

                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
                      >
                        Enregistrer modifications
                      </button>
                    </div>
                  </form>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form action={toggleBlogPostPublishedAction}>
                      <input type="hidden" name="blogPostId" value={post.id} />
                      <input
                        type="hidden"
                        name="nextPublished"
                        value={post.is_published ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        {post.is_published ? "Depublier" : "Publier"}
                      </button>
                    </form>

                    <form action={deleteBlogPostAction}>
                      <input type="hidden" name="blogPostId" value={post.id} />
                      <button
                        type="submit"
                        className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700"
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

