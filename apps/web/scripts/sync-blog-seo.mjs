/** Refresh only published public content. No admin credentials are used. */
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.SEO_API_ORIGIN || 'https://carboscan.io';
async function get(path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Public blog API: ${response.status} ${path}`);
  return response.json();
}
const { items } = await get('/v1/public/blog?lang=fr');
if (!Array.isArray(items)) throw new Error('Invalid blog listing');
const posts = [];
for (const item of items) {
  const { post } = await get(`/v1/public/blog/${encodeURIComponent(item.slug)}`);
  if (!post || (post.status && post.status !== 'published')) throw new Error(`Not a published post: ${item.slug}`);
  const { id, title, slug, excerpt, content, author_name, featured_image_url, published_at, tags, meta_title, meta_description, created_at, status } = post;
  posts.push({ id, title, slug, excerpt, content, author_name, featured_image_url, published_at, tags, meta_title, meta_description, created_at, status: 'published' });
}
await mkdir(new URL('../content/', import.meta.url), { recursive: true });
await writeFile(new URL('../content/blog-snapshot.json', import.meta.url), JSON.stringify(posts, null, 2) + '\n');
console.log(`Exported ${posts.length} published articles. Rebuild the web app to publish their static HTML.`);
