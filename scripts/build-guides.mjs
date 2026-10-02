#!/usr/bin/env node
/**
 * Build The BuzzBuzz Trail from content/guides/*.md into static HTML.
 *
 *   node scripts/build-guides.mjs
 *
 * Source of truth is the markdown. Generated pages live in /guides so the
 * site can keep shipping as static files (no CMS, no framework).
 * Commit both the markdown and the generated HTML.
 *
 * A file is published when:
 *   - it does not start with _
 *   - frontmatter draft is not true
 *   - filename matches slug
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content", "guides");
const outDir = path.join(root, "guides");
const site = "https://buzzbuzz.club";
const defaultImage = `${site}/share-image-light.png`;

const AREAS = [
  { id: "touch-grass", emoji: "🌿", name: "Touch Grass", note: "Get outside. The fancy goals can wait." },
  { id: "with-friends", emoji: "👯", name: "With Friends", note: "Walks that work better with a group chat." },
  { id: "challenge", emoji: "🔥", name: "Challenge Me", note: "Small dares with a finish line." },
  { id: "after-dark", emoji: "🌙", name: "After Dark", note: "When the streetlights come on." },
  { id: "step-nerd", emoji: "🧠", name: "Step Nerd Stuff", note: "Strangely specific answers about steps." },
  { id: "stories", emoji: "🐝", name: "BuzzBuzz Stories", note: "Notes from inside the hive." },
];

const QUESTS = {
  "quick-quest": "Quick Quest",
  "hive-challenge": "Hive Challenge",
  "seasonal-quest": "Seasonal Quest 🎃",
  beginner: "Beginner",
  "night-walk": "Night Walk",
  story: "Hive Note",
};

const areaById = Object.fromEntries(AREAS.map((area) => [area.id, area]));

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseFrontmatter(raw) {
  const text = raw.replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) {
    throw new Error("missing opening frontmatter");
  }
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("missing closing frontmatter");
  const data = {};
  let listKey = null;
  for (const line of text.slice(4, end).split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item) {
      if (!listKey) throw new Error(`list item outside a list: ${line}`);
      data[listKey].push(unquote(item[1].trim()));
      continue;
    }
    const field = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!field) throw new Error(`bad frontmatter line: ${line}`);
    const key = field[1];
    const value = field[2].trim();
    if (value === "") {
      data[key] = [];
      listKey = key;
    } else if (value === "true" || value === "false") {
      data[key] = value === "true";
      listKey = null;
    } else if (key === "order" && /^\d+$/.test(value)) {
      data[key] = Number(value);
      listKey = null;
    } else {
      data[key] = unquote(value);
      listKey = null;
    }
  }
  return { data, body: text.slice(end + 5).trim() };
}

function safeUrl(url) {
  if (
    url.startsWith("/") ||
    url.startsWith("#") ||
    url.startsWith("https://") ||
    url.startsWith("http://")
  ) {
    return url;
  }
  return null;
}

function inline(raw) {
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let html = "";
  let last = 0;
  for (const match of raw.matchAll(re)) {
    html += escapeHtml(raw.slice(last, match.index));
    if (match[1] !== undefined) {
      const href = safeUrl(match[2]);
      if (!href) throw new Error(`unsafe link: ${match[2]}`);
      html += `<a href="${escapeHtml(href)}">${escapeHtml(match[1])}</a>`;
    } else if (match[3] !== undefined) {
      html += `<strong>${escapeHtml(match[3])}</strong>`;
    } else {
      html += `<em>${escapeHtml(match[4])}</em>`;
    }
    last = match.index + match[0].length;
  }
  html += escapeHtml(raw.slice(last));
  return html;
}

function headingId(text, used) {
  const base = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "section";
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function beeAside(raw) {
  const paragraphs = raw
    .trim()
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((part) => `  <p>${inline(part)}</p>`)
    .join("\n");
  return `<aside class="bee-says">\n  <p class="bee-says-label"><span aria-hidden="true">🐝</span> Bee says</p>\n${paragraphs}\n</aside>`;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  const usedIds = new Set();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.trim() === ":::bee") {
      i += 1;
      const buf = [];
      while (i < lines.length && lines[i].trim() !== ":::") {
        buf.push(lines[i]);
        i += 1;
      }
      if (i >= lines.length) throw new Error("unclosed :::bee block");
      i += 1;
      blocks.push(beeAside(buf.join("\n")));
      continue;
    }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = headingId(text, usedIds);
      blocks.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`  <li>${inline(lines[i].replace(/^[-*]\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`  <li>${inline(lines[i].replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ol>\n${items.join("\n")}\n</ol>`);
      continue;
    }
    const buf = [line.trim()];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,3}\s|:::bee\s*$|[-*]\s|\d+\.\s)/.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i += 1;
    }
    blocks.push(`<p>${inline(buf.join(" "))}</p>`);
  }

  return blocks.join("\n\n");
}

function loadArticles() {
  const articles = [];
  for (const file of fs.readdirSync(contentDir).sort()) {
    if (!file.endsWith(".md") || file.startsWith("_")) continue;
    const full = path.join(contentDir, file);
    let parsed;
    try {
      parsed = parseFrontmatter(fs.readFileSync(full, "utf8"));
    } catch (error) {
      throw new Error(`${file}: ${error.message}`);
    }
    const article = parsed.data;
    article.body = parsed.body;
    article.source = file;
    if (article.draft) continue;
    for (const key of ["title", "description", "slug", "date", "category", "questType"]) {
      if (!article[key]) throw new Error(`${file}: missing ${key}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
      throw new Error(`${file}: slug must be lowercase words separated by hyphens`);
    }
    if (file !== `${article.slug}.md`) {
      throw new Error(`${file}: filename must match slug (${article.slug}.md)`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(article.date)) {
      throw new Error(`${file}: date must be YYYY-MM-DD`);
    }
    if (!areaById[article.category]) {
      throw new Error(`${file}: unknown category "${article.category}"`);
    }
    if (!QUESTS[article.questType]) {
      throw new Error(`${file}: unknown questType "${article.questType}"`);
    }
    article.chips = Array.isArray(article.chips) ? article.chips : [];
    article.related = Array.isArray(article.related) ? article.related : [];
    article.featured = Boolean(article.featured);
    article.html = markdownToHtml(article.body);
    articles.push(article);
  }

  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  for (const article of articles) {
    for (const slug of article.related) {
      if (!bySlug.has(slug) || slug === article.slug) {
        throw new Error(`${article.source}: related slug not found: ${slug}`);
      }
    }
  }
  return articles;
}

function compareQuests(a, b) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.order != null && b.order != null && a.order !== b.order) return a.order - b.order;
  return b.date.localeCompare(a.date);
}

function pageTitle(article) {
  const base = article.seoTitle || article.title;
  return base.includes("BuzzBuzz") ? base : `${base} | BuzzBuzz`;
}

function metaParts(article) {
  const parts = [...article.chips];
  if (article.readTime) parts.push(article.readTime);
  return parts;
}

function kicker(article) {
  return `${QUESTS[article.questType]} · ${areaById[article.category].name}`;
}

function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function articleUrl(slug) {
  return `${site}/guides/${slug}`;
}

function imageUrl(article) {
  if (!article.hero) return defaultImage;
  if (article.hero.startsWith("http://") || article.hero.startsWith("https://")) return article.hero;
  return `${site}${article.hero.startsWith("/") ? "" : "/"}${article.hero}`;
}

function jsonScript(data) {
  const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">\n${json}\n  </script>`;
}

const appleSvg = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.04c-.03-2.83 2.31-4.19 2.42-4.26-1.32-1.93-3.38-2.2-4.11-2.22-1.75-.18-3.42 1.03-4.31 1.03-.89 0-2.27-1.01-3.74-.98-1.92.03-3.7 1.12-4.69 2.84-2 3.47-.51 8.6 1.43 11.42.95 1.38 2.08 2.92 3.56 2.87 1.43-.06 1.97-.92 3.7-.92 1.72 0 2.21.92 3.72.89 1.54-.03 2.51-1.4 3.45-2.79 1.09-1.6 1.54-3.15 1.57-3.23-.03-.01-3.01-1.15-3.04-4.58zM14.34 3.65c.79-.96 1.32-2.29 1.18-3.62-1.14.05-2.52.76-3.34 1.71-.73.85-1.37 2.21-1.2 3.51 1.27.1 2.57-.65 3.36-1.6z"/></svg>`;

const playSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="gpA" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#00d4ff"/><stop offset="1" stop-color="#00b8e6"/></linearGradient><linearGradient id="gpB" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ffce00"/><stop offset="1" stop-color="#ffa800"/></linearGradient><linearGradient id="gpC" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ff3a44"/><stop offset="1" stop-color="#c31162"/></linearGradient><linearGradient id="gpD" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#00f076"/><stop offset="1" stop-color="#00c853"/></linearGradient></defs><path fill="url(#gpA)" d="M3.6 1.7c-.4.4-.6 1-.6 1.8v17c0 .8.2 1.4.6 1.8l.1.1L13.2 13v-.2L3.7 1.7h-.1z"/><path fill="url(#gpB)" d="M16.4 16.2 13.2 13v-.2l3.2-3.2.1.1 3.8 2.2c1.1.6 1.1 1.6 0 2.2l-3.8 2.2-.1-.1z"/><path fill="url(#gpC)" d="M16.5 16.1 13.2 12.8 3.6 22.4c.4.4 1 .4 1.7 0l11.2-6.3"/><path fill="url(#gpD)" d="M16.5 9.7 5.3 3.4c-.7-.4-1.3-.4-1.7 0l9.6 9.6 3.3-3.3z"/></svg>`;

function storeBadges() {
  return `<nav class="cta-row" aria-label="Download BuzzBuzz">
      <a href="https://apps.apple.com/us/app/buzzbuzz-step-tracker/id6767195595" class="store-badge" target="_blank" rel="noopener" aria-label="Download BuzzBuzz on the App Store">
        ${appleSvg}
        <span class="badge-text"><span class="badge-small">Download on the</span><span class="badge-large">App Store</span></span>
      </a>
      <a href="https://play.google.com/store/apps/details?id=com.buzzbuzz.steptracker" class="store-badge" target="_blank" rel="noopener" aria-label="Get BuzzBuzz on Google Play">
        ${playSvg}
        <span class="badge-text"><span class="badge-small">Get it on</span><span class="badge-large">Google Play</span></span>
      </a>
    </nav>`;
}

function footerHtml({ trailCurrent = false } = {}) {
  const trail = trailCurrent
    ? `<span aria-current="page">Trail</span>`
    : `<a href="/guides">Trail</a>`;
  return `<footer class="site-footer">
    <nav class="footer-links" aria-label="Footer">
      <a class="ig-link" href="https://www.instagram.com/buzzbuzz_stepcount/" target="_blank" rel="noopener me" aria-label="Follow BuzzBuzz on Instagram">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        @buzzbuzz_stepcount
      </a>
      <span class="dot" aria-hidden="true">·</span>
      ${trail}
      <span class="dot" aria-hidden="true">·</span>
      <a href="https://www.notion.so/BUZZBUZZ-Privacy-Policy-35988e07417f809ba9b1d6759e20817e" target="_blank" rel="noopener">Privacy Policy</a>
    </nav>
    <p>BuzzBuzz &copy; 2026 &middot; walk. snap. buzz.</p>
  </footer>`;
}

function qrHtml(source) {
  return `<a class="qr-download-card" href="/download?source=${source}">
    <img src="/buzzbuzz-download-qr.svg" alt="QR code to download BuzzBuzz" width="328" height="328" decoding="async" />
    <span class="qr-download-title">Get BuzzBuzz</span>
    <span class="qr-download-hint">Scan with your phone</span>
  </a>`;
}

function brandHtml() {
  return `<a class="brand" href="/">
      <img src="/app-icon.png" alt="" width="84" height="84" />
      <span>BuzzBuzz</span>
    </a>`;
}

function pageShell({
  title,
  description,
  canonical,
  ogType,
  image,
  imageAlt,
  extraMeta = "",
  jsonLd = [],
  body,
  comment,
}) {
  const schemas = jsonLd.map((entry) => `  ${jsonScript(entry)}`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- ${comment} -->
  <script src="/posthog-config.js"></script>
  <script src="/posthog.js"></script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#efaa08" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="author" content="BuzzBuzz" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="BuzzBuzz" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  ${image === defaultImage ? `<meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />` : ""}
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
  ${extraMeta}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <link rel="icon" type="image/png" sizes="48x48" href="https://buzzbuzz.club/favicon-48.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="https://buzzbuzz.club/favicon-192.png" />
  <link rel="shortcut icon" href="https://buzzbuzz.club/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="https://buzzbuzz.club/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" />
  <link rel="stylesheet" href="/guides/trail.css" />
  <link rel="stylesheet" href="/sticky-widgets.css" />
${schemas}
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
${body}
</body>
</html>
`;
}

function questCard(article, { compact = false, side = "" } = {}) {
  const meta = metaParts(article);
  const metaHtml = meta.length ? `\n        <p class="meta">${escapeHtml(meta.join(" · "))}</p>` : "";
  const card = `<a class="quest-card${compact ? " compact" : ""}" href="/guides/${article.slug}">
        <p class="kicker">${escapeHtml(kicker(article))}</p>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="dek">${escapeHtml(article.description)}</p>${metaHtml}
      </a>`;
  if (compact) return `    <li>\n      ${card}\n    </li>`;
  return `      <li class="side-${side}">\n        ${card}\n      </li>`;
}

function ctaSection() {
  return `<section class="cta" aria-labelledby="cta-title">
    <h2 id="cta-title">Walking is better together.</h2>
    <p>Invite your friends, start a Hive and see where your steps take you.</p>
    ${storeBadges()}
  </section>`;
}

function renderLanding(articles) {
  let side = 0;
  const sections = AREAS.map((area) => {
    const quests = articles.filter((article) => article.category === area.id).sort(compareQuests);
    if (!quests.length) return "";
    const items = quests
      .map((article) => {
        const html = questCard(article, { side: side % 2 === 0 ? "left" : "right" });
        side += 1;
        return html;
      })
      .join("\n");
    return `    <section class="area" aria-labelledby="area-${area.id}">
      <div class="area-head">
        <span class="node" aria-hidden="true">${area.emoji}</span>
        <div>
          <h2 id="area-${area.id}">${escapeHtml(area.name)}</h2>
          <p class="area-note">${escapeHtml(area.note)}</p>
        </div>
      </div>
      <ol class="quests">
${items}
      </ol>
    </section>`;
  }).filter(Boolean).join("\n");

  const description = "Walking guides, step-count answers, and small challenges from BuzzBuzz. Pick a trail, start a streak, or learn something strangely specific about steps.";
  const canonical = `${site}/guides`;
  const itemList = articles
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: article.title,
      url: articleUrl(article.slug),
    }));

  const body = `  <header class="top">
    ${brandHtml()}
  </header>
  <main id="main">
    <section class="trail-hero" aria-labelledby="trail-title">
      <p class="bee-mark" aria-hidden="true">🐝</p>
      <h1 id="trail-title">The BuzzBuzz <span class="mark"><span>Trail</span><img src="/hero/underline.webp" alt="" width="561" height="85" decoding="async" /></span></h1>
      <p class="lede">Walking guides, challenges &amp; tiny adventures.</p>
      <p class="support">Pick a trail, find a challenge, or learn something strangely specific about steps.</p>
    </section>
    <div class="trail">
${sections}
      <div class="trail-end">
        <span class="node" aria-hidden="true">🐝</span>
        <p>That’s the trail so far. More stops when we walk them.</p>
      </div>
    </div>
    ${ctaSection()}
  </main>
  ${footerHtml({ trailCurrent: true })}
  ${qrHtml("trail_desktop_qr")}`;

  return pageShell({
    title: "The BuzzBuzz Trail — Walking Guides & Step Challenges | BuzzBuzz",
    description,
    canonical,
    ogType: "website",
    image: defaultImage,
    imageAlt: "BuzzBuzz — walking guides, challenges, and tiny adventures",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "The BuzzBuzz Trail",
        description,
        url: canonical,
        isPartOf: { "@type": "WebSite", name: "BuzzBuzz", url: `${site}/` },
        mainEntity: { "@type": "ItemList", itemListElement: itemList },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "BuzzBuzz", item: `${site}/` },
          { "@type": "ListItem", position: 2, name: "The BuzzBuzz Trail", item: canonical },
        ],
      },
    ],
    body,
    comment: "Generated by scripts/build-guides.mjs. Edit content/guides, then rebuild.",
  });
}

function relatedArticles(article, bySlug) {
  const chosen = article.related.map((slug) => bySlug.get(slug));
  if (chosen.length >= 2) return chosen.slice(0, 3);
  const extras = [...bySlug.values()].filter((other) => other.slug !== article.slug && !article.related.includes(other.slug));
  extras.sort((a, b) => {
    const sameA = a.category === article.category ? 0 : 1;
    const sameB = b.category === article.category ? 0 : 1;
    if (sameA !== sameB) return sameA - sameB;
    return b.date.localeCompare(a.date);
  });
  return [...chosen, ...extras].slice(0, 3);
}

function renderArticle(article, bySlug) {
  const canonical = articleUrl(article.slug);
  const title = pageTitle(article);
  const description = article.seoDescription || article.description;
  const image = imageUrl(article);
  const meta = metaParts(article);
  const related = relatedArticles(article, bySlug);
  const hero = article.hero
    ? `\n      <figure class="hero-fig">\n        <img src="${escapeHtml(article.hero.startsWith("http") ? article.hero : article.hero.startsWith("/") ? article.hero : `/${article.hero}`)}" alt="" width="1200" height="630" />\n      </figure>`
    : "";
  const metaHtml = meta.length ? `\n      <p class="meta">${escapeHtml(meta.join(" · "))}</p>` : "";
  const relatedHtml = related.length
    ? `<section class="still" aria-labelledby="still-buzzing">
    <h2 id="still-buzzing">Still buzzing? <span aria-hidden="true">🐝</span></h2>
    <ol class="next-stops">
${related.map((item) => questCard(item, { compact: true })).join("\n")}
    </ol>
  </section>`
    : "";

  const body = `  <header class="top">
    ${brandHtml()}
    <a class="back-link" href="/guides">← Trail</a>
  </header>
  <main id="main">
    <article class="sheet">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="/">BuzzBuzz</a>
        <span aria-hidden="true">/</span>
        <a href="/guides">Trail</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">${escapeHtml(article.title)}</span>
      </nav>
      <p class="kicker">${escapeHtml(kicker(article))}</p>
      <h1>${escapeHtml(article.title)}</h1>
      <p class="dek">${escapeHtml(article.description)}</p>${metaHtml}
      <p class="byline"><time datetime="${article.date}">${formatDate(article.date)}</time></p>${hero}
      <div class="prose">
${article.html}
      </div>
    </article>
    ${relatedHtml}
    ${ctaSection()}
  </main>
  ${footerHtml()}
  ${qrHtml("trail_article_desktop_qr")}`;

  return pageShell({
    title,
    description,
    canonical,
    ogType: "article",
    image,
    imageAlt: article.title,
    extraMeta: `<meta property="article:published_time" content="${article.date}" />\n  <meta property="article:modified_time" content="${article.date}" />`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description,
        datePublished: article.date,
        dateModified: article.date,
        author: { "@type": "Organization", name: "BuzzBuzz", url: `${site}/` },
        publisher: {
          "@type": "Organization",
          name: "BuzzBuzz",
          url: `${site}/`,
          logo: { "@type": "ImageObject", url: `${site}/app-icon.png` },
        },
        image,
        mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
        url: canonical,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "BuzzBuzz", item: `${site}/` },
          { "@type": "ListItem", position: 2, name: "The BuzzBuzz Trail", item: `${site}/guides` },
          { "@type": "ListItem", position: 3, name: article.title, item: canonical },
        ],
      },
    ],
    body,
    comment: `Generated from content/guides/${article.source} by scripts/build-guides.mjs. Do not edit by hand.`,
  });
}

function urlBlock(articles, { images }) {
  const latest = articles.map((article) => article.date).sort().at(-1);
  const entries = [
    urlEntry(`${site}/guides`, latest, { changefreq: "weekly", priority: "0.8" }),
    ...articles
      .slice()
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((article) => urlEntry(articleUrl(article.slug), article.date, {
        changefreq: "monthly",
        priority: "0.6",
        image: images && article.hero ? { loc: imageUrl(article), title: article.title } : null,
      })),
  ];
  return `<!-- guides:start -->\n${entries.join("\n")}\n  <!-- guides:end -->`;
}

function urlEntry(loc, lastmod, { changefreq, priority, image }) {
  const imageXml = image
    ? `\n    <image:image>\n      <image:loc>${escapeXml(image.loc)}</image:loc>\n      <image:title>${escapeXml(image.title)}</image:title>\n    </image:image>`
    : "";
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>${imageXml}\n  </url>`;
}

function upsertSitemap(file, block) {
  const start = "<!-- guides:start -->";
  const end = "<!-- guides:end -->";
  let xml = fs.readFileSync(file, "utf8");
  if (xml.includes(start) && xml.includes(end)) {
    xml = xml.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block);
  } else {
    const close = xml.lastIndexOf("</urlset>");
    if (close === -1) throw new Error(`${file}: missing </urlset>`);
    xml = `${xml.slice(0, close)}  ${block}\n${xml.slice(close)}`;
  }
  fs.writeFileSync(file, xml);
}

function writeOutput(articles) {
  fs.mkdirSync(outDir, { recursive: true });
  const slugs = new Set(articles.map((article) => article.slug));
  for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !slugs.has(entry.name)) {
      fs.rmSync(path.join(outDir, entry.name), { recursive: true, force: true });
    }
  }
  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  fs.writeFileSync(path.join(outDir, "index.html"), renderLanding(articles));
  for (const article of articles) {
    const dir = path.join(outDir, article.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), renderArticle(article, bySlug));
  }
  upsertSitemap(path.join(root, "sitemap.xml"), urlBlock(articles, { images: true }));
  upsertSitemap(path.join(root, "sitemap-pages.xml"), urlBlock(articles, { images: false }));
}

const articles = loadArticles();
if (!articles.length) {
  throw new Error("No guides to publish. Add a markdown file in content/guides.");
}
writeOutput(articles);
console.log(`Built The BuzzBuzz Trail (${articles.length} guides)`);
for (const article of articles) console.log(`  /guides/${article.slug}`);
