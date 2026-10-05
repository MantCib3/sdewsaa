# The Anagoge

A quiet, monochrome editorial site for essays, papers, and short notes, using The Anagoge's supplied white-on-black logo. Built with plain HTML, CSS, and JavaScript, with a small **dependency-free Node.js static generator**. No framework install, server, database service, accounts, or third-party tracking.

## Run locally

Requires Node.js 22 or later. No dependency installation is needed.

```sh
npm run dev
```

Open http://127.0.0.1:3000. Development mode rebuilds on source/style changes; refresh the browser after saving. To preview the actual static export:

```sh
npm run build
npm start
```

`npm start` serves `out` locally, including the real 404 page. It is a development preview server, not a production backend. Set `PORT` if 3000 is occupied.

## Make it yours

Edit [src/data/site.json](src/data/site.json):

- Set `title`, `author`, `initials`, `tagline`, `headline`, `intro`, and `bio`.
- **Replace `url` with your actual HTTPS domain or Pages domain.** Use the origin only, without a subpath. This controls canonical URLs, RSS, sitemap, citations, and share metadata.
- Set `interests`. Optionally set `email` and `links` (objects with `label` and `url`). Empty contact fields are hidden, not rendered as broken links.
- Set `showSampleNotice` to `false` after replacing the demonstration content.
- The supplied [public/logo.png](public/logo.png) is used in the header, footer, journal sidebar, about page, favicon, and social preview metadata. Replace it there to update the mark everywhere. Its black background blends into the dark theme without modifying the original artwork.

The six included pieces are original **demonstration writing**, explicitly marked as samples. They are not your work, credentials, or peer-reviewed research. Replace or remove them before launch. The biography is also editable starter copy.

## Publish from JSON

[src/data/posts.json](src/data/posts.json) is the content store. Add an object using this structure:

```json
{
  "slug": "my-first-essay",
  "title": "My first essay",
  "type": "Essay",
  "date": "2026-10-02",
  "updated": null,
  "description": "A short summary for the archive and search engines.",
  "tags": ["Knowledge", "Practice"],
  "featured": true,
  "draft": false,
  "sample": false,
  "pdf": null,
  "body": "Opening paragraph.\n\n## A section\n\nYour writing in **Markdown**.\n\n[Source](https://example.org)"
}
```

- `slug`: unique lowercase letters/numbers separated by hyphens. Determines `/writing/my-first-essay/`. Keep it stable once published.
- `type`: exactly `Essay`, `Paper`, or `Note`.
- `date`: a real `YYYY-MM-DD` date. `updated`: `null`, or a revision date on/after publication.
- `tags`: unique topic strings. Topic links and counts update automatically.
- `featured`: only one published piece may be featured. If none is selected, the newest piece is used.
- `draft`: `true` excludes the piece from **all** public pages, the search data, feed, and sitemap. Dates do not schedule publication: a future-dated, non-draft entry is published immediately at build time.
- `sample`: keep `true` only for demo content; set `false` for your writing.
- `body`: lightweight Markdown in a JSON string. Use `\n` for newlines. Supports `#` headings, `**bold**`, `*italic*`, backtick code, fenced code blocks, simple single-level lists, quotations, HTTP(S)/root-relative links and images, and pipe tables. Use blank lines between blocks. Heading navigation is generated automatically. This intentionally small subset does not implement nested lists, footnotes, reference-style links, or embedded HTML. Raw HTML is escaped. Never put secrets in content.
- `pdf`: optional HTTPS link, or `/files/my-paper.pdf` for a PDF placed in `public/files`. Use `null` when no PDF exists.

Use a JSON-aware editor to avoid unescaped quotes or literal newlines inside strings. Invalid configuration, duplicate slugs, invalid dates, or malformed required fields fail the build with an explicit error. There is no browser-based editing/admin interface: edit JSON and redeploy.

## Included

- Responsive writing-first home with the journal introduction at the bottom, searchable archive, individual article pages, author/about page, and custom 404.
- Format/topic filters, full-text search, oldest/newest sorting, and shareable archive filters.
- Readable Markdown with paper abstracts, tables, sources, optional PDF links, related writing, reading times, and revision dates.
- Copyable citations, BibTeX downloads, and print/save-as-PDF styles.
- RSS at `/feed.xml`, sitemap at `/sitemap.xml`, and `/robots.txt`.
- Page titles/descriptions, canonical URLs, article structured data, favicon, and social title/description metadata.
- Keyboard focus states, skip link, live search result counts, reduced-motion support, and no externally fetched fonts.
- Cloudflare security headers and a content policy that does not require inline executable scripts.

Search and citation buttons use a small native JavaScript module. Core page content is prerendered and readable without JavaScript. RSS subscription means copying the feed URL into a feed reader; no email mailing-list service is configured.

All published content is public. JSON is a build-time content store, not a protected online database.

## Deploy on Cloudflare Pages

Push this folder to a GitHub/GitLab repository, then create a **Pages** project and import that repository. Choose no framework preset.

| Setting | Value |
| --- | --- |
| Root directory | Leave empty if this folder is the repository root; otherwise `folio` |
| Build command | `npm run build` |
| Build output directory | `out` |
| Environment variable | `NODE_VERSION=24` |

Cloudflare serves the static export. No Functions, API keys, bindings, D1, or Wrangler configuration are needed. Each content edit triggers a new build when pushed. Do not add an SPA catch-all redirect: the exported routes and `404.html` handle navigation correctly.

For manual/direct upload, build locally and upload the **contents of `out`**, including `_headers`, through the Pages dashboard.

The static `_headers` policy restricts framing, object embeds, permissions, and content sources. The localhost preview does not emulate Cloudflare headers; verify them after deployment. The `.mjs` MIME header ensures the search helper loads as a JavaScript module.

Cloudflare reference: [Deploy a static HTML site](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/).

## Before launch

1. Replace profile/site copy, the domain, and the favicon.
2. Replace/delete sample posts; remove sample notices for your own posts.
3. Add and check any PDF files/contact/profile links.
4. Run `npm test`, `npm run build`, and `npm run test:export`.
5. Deploy `out`; check a direct article URL, unknown URL (404), RSS, mobile layout, and share preview on your actual domain.

## Checks

```sh
npm test
npm run build
npm run test:export
```

Tests cover content validation, draft exclusion, search/filter combinations, empty archives, date formatting, reading times, XML/BibTeX escaping, safe Markdown rendering, and actual exported routes/metadata/feed/sitemap.

### This workspace

Open this `folio` folder directly in VS Code to use the included build/test/preview tasks. Builds use only Node.js built-ins: there is no dependency cache or package installation to maintain.
