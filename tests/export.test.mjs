import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve("out", path), "utf8");
const posts = JSON.parse(readFileSync("src/data/posts.json", "utf8"));
const site = JSON.parse(readFileSync("src/data/site.json", "utf8"));
const origin = site.url.replace(/\/$/, "");
const published = posts.filter((post) => !post.draft);

test("Netlify builds and publishes the generated static directory", () => {
  const config = readFileSync("netlify.toml", "utf8");
  const build = config.match(/^\[build\]\r?\n([\s\S]*?)(?=^\[)/m)?.[1];
  assert.ok(build, "Missing Netlify build configuration");
  assert.match(build, /^\s*command = "npm run build"\s*$/m);
  assert.match(build, /^\s*publish = "out"\s*$/m);
  assert.match(config, /\[build\.environment\]\s+NODE_VERSION = "24"/);
  assert.equal(config.includes("[[redirects]]"), false, "Static pages must not use a catch-all SPA rewrite");
  assert.ok(existsSync(resolve("out", "index.html")));
});

test("static export has all core routes and a real 404", () => {
  for (const path of ["index.html", "writing/index.html", "about/index.html", "404.html", "feed.xml", "sitemap.xml", "robots.txt", "_headers"]) {
    assert.ok(existsSync(resolve("out", path)), `Missing exported file: ${path}`);
  }
  assert.match(read("404.html"), /Not in the margins/);
  assert.match(read("index.html"), /Skip to content/);
});

test("every published article has content and canonical metadata", () => {
  for (const post of published) {
    const html = read(`writing/${post.slug}/index.html`);
    assert.ok(html.includes(`${origin}/writing/${post.slug}/`), `Missing canonical for ${post.slug}`);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /Cite this piece/);
    assert.match(html, /class="prose"/);
  }
  for (const draft of posts.filter((post) => post.draft)) {
    assert.equal(existsSync(resolve("out", `writing/${draft.slug}/index.html`)), false);
  }
});

test("homepage keeps writing and navigation without the redundant introductory blocks", () => {
  const html = read("index.html");
  for (const removed of ['class="hero"', 'class="sample-notice"', 'class="site-footer"', "Worth a closer read", "There’s more in the margins.", "Browse the full archive", "Explore the writing", "Considered writing. An open notebook."]) {
    assert.equal(html.includes(removed), false, `Homepage still contains ${removed}`);
  }
  for (const retained of ['class="home-grid"', 'id="latest-heading"', 'aria-label="Main navigation"', 'href="/writing/"', 'href="/about/"', 'href="/feed.xml"']) {
    assert.ok(html.includes(retained), `Homepage lost ${retained}`);
  }
  assert.match(html, /<h1 class="sr-only">The Anagoge: Writing<\/h1>/);
  assert.match(read("about/index.html"), /class="site-footer"/);
});

test("header is logo-only and the about page omits the fixed format statistic", () => {
  for (const path of ["index.html", "writing/index.html", "about/index.html", ...published.map((post) => `writing/${post.slug}/index.html`)]) {
    const html = read(path);
    const header = html.match(/<header class="site-header">([\s\S]*?)<\/header>/)?.[1];
    assert.ok(header?.includes('aria-label="The Anagoge home"'));
    assert.ok(header.includes('class="site-logo"'));
    assert.equal(header.includes('class="brand-name"'), false);
    assert.equal(header.includes('class="brand-tagline"'), false);
  }
  const about = read("about/index.html");
  assert.equal(about.includes("ways of thinking"), false);
  assert.equal(about.includes("<strong>03</strong>"), false);
  assert.ok(about.includes("published pieces"));
});

test("interface arrows are SVGs rather than emoji-capable text glyphs", () => {
  for (const path of ["index.html", "writing/index.html", "about/index.html", ...published.map((post) => `writing/${post.slug}/index.html`)]) {
    const html = read(path).replace(/<div class="prose">[\s\S]*?<\/div><div class="article-end">/, "");
    assert.doesNotMatch(html, /[↗↓←→]/u, `${path}: text arrow remains`);
    assert.match(html, /<svg[^>]+focusable="false"/);
  }
  const article = read(`writing/${published[0].slug}/index.html`);
  assert.match(article, /class="back-link"[^>]*><svg/);
  assert.match(article, /BibTeX <svg/);
});

test("feed and sitemap list every public article and no drafts", () => {
  const feed = read("feed.xml");
  const sitemap = read("sitemap.xml");
  assert.equal((feed.match(/<item>/g) ?? []).length, published.length);
  for (const post of posts) {
    const url = `${origin}/writing/${post.slug}/`;
    assert.equal(feed.includes(url), !post.draft);
    assert.equal(sitemap.includes(url), !post.draft);
  }
  assert.ok(read("robots.txt").includes(`${origin}/sitemap.xml`));
});

test("all internal page links, section anchors and assets resolve", () => {
  const pages = ["index.html", "writing/index.html", "about/index.html", "404.html", ...published.map((post) => `writing/${post.slug}/index.html`)];
  for (const path of pages) {
    const html = read(path);
    for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (!raw.startsWith("/") && !raw.startsWith("#")) continue;
      const url = new URL(raw.replace(/&amp;/g, "&"), `https://preview.test/${path}`);
      const relative = url.pathname.replace(/^\//, "");
      let target = resolve("out", relative);
      assert.ok(existsSync(target), `${path}: missing target ${raw}`);
      if (statSync(target).isDirectory()) target = resolve(target, "index.html");
      assert.ok(existsSync(target), `${path}: missing page ${raw}`);
      if (url.hash) {
        const targetHtml = readFileSync(target, "utf8");
        const id = decodeURIComponent(url.hash.slice(1));
        assert.ok(targetHtml.includes(`id="${id}"`), `${path}: missing anchor ${raw}`);
      }
    }
  }
  assert.match(read("_headers"), /\/content\.mjs\s+Content-Type: text\/javascript/);
});

test("publication branding and supplied logo are consistent across routes", () => {
  assert.equal(site.title, "The Anagoge");
  const pages = ["index.html", "writing/index.html", "about/index.html", "404.html", ...published.map((post) => `writing/${post.slug}/index.html`)];
  for (const path of pages) {
    const html = read(path);
    assert.ok(html.includes(`— ${site.title}</title>`), `${path}: wrong publication title`);
    assert.ok(html.includes('class="site-logo" src="/logo.png"'), `${path}: missing logo`);
    assert.ok(html.includes('rel="icon" type="image/png" href="/logo.png"'), `${path}: wrong favicon`);
    assert.ok(html.includes(`property="og:image" content="${origin}/logo.png"`), `${path}: missing social logo`);
    assert.equal(html.includes("Marginalia"), false, `${path}: obsolete brand`);
  }
  assert.ok(read("feed.xml").includes(`<title>${site.title}</title>`));
  assert.ok(read(`writing/${published[0].slug}/citation.bib`).includes(site.title));
  const logo = readFileSync(resolve("out", "logo.png"));
  assert.equal(logo.subarray(1, 4).toString(), "PNG");
  assert.deepEqual(logo, readFileSync(resolve("public", "logo.png")));
});

test("stylesheet uses a fully monochrome palette", () => {
  const colors = [...read("styles.css").matchAll(/#([a-f0-9]{6}|[a-f0-9]{3})\b/gi)].map((match) => match[1]);
  assert.ok(colors.length > 0);
  for (const color of colors) {
    const full = color.length === 3 ? [...color].map((value) => value.repeat(2)).join("") : color;
    assert.equal(full.slice(0, 2), full.slice(2, 4), `Non-monochrome color #${color}`);
    assert.equal(full.slice(2, 4), full.slice(4, 6), `Non-monochrome color #${color}`);
  }
});
