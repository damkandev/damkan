import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

type PostRecord = {
  _id?: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

const toResponse = (post: PostRecord & { _id: string }) => ({
  id: post._id,
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt ?? "",
  content: post.content,
  publishedAt: post.publishedAt ?? null,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("posts").collect();

    return items
      .filter((post) => Boolean(post.publishedAt))
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .map(toResponse);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("posts").collect();

    return items
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
      .map(toResponse);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .unique();

    return post ? toResponse(post) : null;
  },
});

export const save = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    content: v.string(),
    published: v.optional(v.boolean()),
    publishedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const normalizedSlug = args.slug.toLowerCase();

    const existing = await ctx.db
      .query("posts")
      .withIndex("slug", (q) => q.eq("slug", normalizedSlug))
      .unique();

    const publishedAt =
      typeof args.publishedAt !== "undefined"
        ? args.publishedAt
        : args.published
        ? now
        : existing?.publishedAt ?? null;

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        slug: normalizedSlug,
        excerpt: args.excerpt ?? null,
        content: args.content,
        publishedAt,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("posts", {
      title: args.title,
      slug: normalizedSlug,
      excerpt: args.excerpt ?? null,
      content: args.content,
      publishedAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});
