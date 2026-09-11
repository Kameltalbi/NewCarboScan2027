/**
 * Build-time SEO static files for CarboScan.
 * Generates sitemap.xml + robots.txt into public/ and dist/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://carboscan.io";

/** All publicly indexable marketing / SEO pages */
const PUBLIC_SITEMAP_ROUTES = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/about", changefreq: "monthly", priority: 0.8 },
  { path: "/team", changefreq: "monthly", priority: 0.6 },
  { path: "/contact", changefreq: "monthly", priority: 0.8 },
  { path: "/pricing", changefreq: "weekly", priority: 0.9 },
  { path: "/demo", changefreq: "monthly", priority: 0.9 },
  { path: "/faq", changefreq: "monthly", priority: 0.8 },
  { path: "/blog", changefreq: "weekly", priority: 0.8 },
  { path: "/bilan-carbone", changefreq: "monthly", priority: 0.9 },
  { path: "/facteurs-emission", changefreq: "monthly", priority: 0.85 },
  { path: "/empreinte-produit", changefreq: "monthly", priority: 0.8 },
  { path: "/acv-landing", changefreq: "monthly", priority: 0.7 },
  { path: "/collect", changefreq: "monthly", priority: 0.8 },
  { path: "/cbam", changefreq: "monthly", priority: 0.7 },
  { path: "/wattbim", changefreq: "monthly", priority: 0.7 },
  { path: "/decarbotech", changefreq: "monthly", priority: 0.6 },
  { path: "/bilan-gratuit", changefreq: "monthly", priority: 0.8 },
  { path: "/comment-ca-marche", changefreq: "monthly", priority: 0.7 },
  { path: "/solutions", changefreq: "monthly", priority: 0.7 },
  { path: "/solutions/solutions", changefreq: "monthly", priority: 0.6 },
  { path: "/solutions/accompagnement", changefreq: "monthly", priority: 0.6 },
  { path: "/formation-bilan-carbone", changefreq: "monthly", priority: 0.6 },
  { path: "/ateliers-internes", changefreq: "monthly", priority: 0.5 },
  { path: "/strategie-decarbonation", changefreq: "monthly", priority: 0.6 },
  { path: "/developers", changefreq: "monthly", priority: 0.5 },
  { path: "/changelog", changefreq: "monthly", priority: 0.4 },
  { path: "/legal-mentions", changefreq: "yearly", priority: 0.3 },
  { path: "/privacy-policy", changefreq: "yearly", priority: 0.3 },
  { path: "/cgv", changefreq: "yearly", priority: 0.3 },
  { path: "/bilan-carbone-industrie", changefreq: "monthly", priority: 0.8 },
  { path: "/bilan-carbone-transport", changefreq: "monthly", priority: 0.8 },
  { path: "/bilan-carbone-btp", changefreq: "monthly", priority: 0.8 },
  { path: "/bilan-carbone-agroalimentaire", changefreq: "monthly", priority: 0.8 },
  { path: "/bilan-carbone-energie", changefreq: "monthly", priority: 0.8 },
  { path: "/inscription", changefreq: "monthly", priority: 0.7 },
  { path: "/plan-essentiel", changefreq: "monthly", priority: 0.5 },
  { path: "/carbo-pro", changefreq: "monthly", priority: 0.5 },
  { path: "/carbo-omnibus", changefreq: "monthly", priority: 0.5 },
  { path: "/premium", changefreq: "monthly", priority: 0.5 },
  { path: "/calculateur-carbone", changefreq: "monthly", priority: 0.7 },
  { path: "/empreinte-produit-calculator", changefreq: "monthly", priority: 0.6 },
  { path: "/cbam-calculator", changefreq: "monthly", priority: 0.6 },
  { path: "/simulateur-economique", changefreq: "monthly", priority: 0.5 },
  { path: "/carboscan-academy", changefreq: "monthly", priority: 0.5 },
  { path: "/autres-services", changefreq: "monthly", priority: 0.5 },
  { path: "/emission-factors", changefreq: "monthly", priority: 0.4 },
  { path: "/calculateur-roi", changefreq: "monthly", priority: 0.7 },
];

const ROBOTS_TXT = `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

function buildSitemapXml(lastmod) {
  const urls = PUBLIC_SITEMAP_ROUTES.map(({ path: routePath, changefreq, priority }) => {
    const loc = routePath === "/" ? `${SITE_URL}/` : `${SITE_URL}${routePath}`;
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function writeSeoFiles(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const lastmod = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(outDir, "sitemap.xml"), buildSitemapXml(lastmod), "utf8");
  fs.writeFileSync(path.join(outDir, "robots.txt"), ROBOTS_TXT, "utf8");
}

/** Vite plugin: write sitemap.xml + robots.txt into public/ and dist/. */
export function seoStaticFilesPlugin() {
  const publicDir = path.join(ROOT, "public");
  return {
    name: "carboscan-seo-static-files",
    buildStart() {
      writeSeoFiles(publicDir);
    },
    closeBundle() {
      const distDir = path.join(ROOT, "dist");
      if (fs.existsSync(distDir)) {
        writeSeoFiles(distDir);
      }
    },
  };
}

writeSeoFiles(path.join(ROOT, "public"));
