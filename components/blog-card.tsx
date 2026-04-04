import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/types";

type BlogCardProps = {
  post: BlogPost;
};

export const BlogCard = ({ post }: BlogCardProps) => {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,42,77,0.09)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,42,77,0.14)]">
      <Link href={`/blog/${post.slug}`} className="block">
        <Image
          src={post.image}
          alt={post.title}
          width={600}
          height={360}
          className="aspect-[16/9] w-full object-cover"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {post.publishedAt} - {post.readTime}
        </p>
        <Link
          href={`/blog/${post.slug}`}
          className="mt-2 block min-h-[56px] text-xl font-extrabold leading-tight text-brand-blue transition hover:text-brand-orange"
        >
          {post.title}
        </Link>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
        <Link href={`/blog/${post.slug}`} className="btn-primary mt-4 w-fit px-4 py-2">
          Lire plus
        </Link>
      </div>
    </article>
  );
};
