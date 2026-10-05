export const postTypes = ["Essay", "Paper", "Note"];

function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function stringList(value) {
  return Array.isArray(value) && value.every(text);
}

function requiredText(value, label) {
  if (!text(value)) throw new Error(`${label} must be a non-empty string.`);
  return value;
}

function isPostType(value) {
  return postTypes.some((type) => type === value);
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function httpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateSite(value) {
  if (!record(value)) throw new Error("site.json must contain an object.");
  if (!httpUrl(value.url) || new URL(value.url).pathname !== "/" || new URL(value.url).search || new URL(value.url).hash) {
    throw new Error("site.json: url must be an absolute HTTP(S) origin, without a path, query, or fragment.");
  }
  if (!stringList(value.interests)) throw new Error("site.json: interests must be an array of strings.");
  if (typeof value.email !== "string" || (value.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))) {
    throw new Error("site.json: email must be empty or a valid email address.");
  }
  if (!Array.isArray(value.links)) throw new Error("site.json: links must be an array.");
  const links = value.links.map((link) => {
    if (!record(link) || !text(link.label) || !httpUrl(link.url)) throw new Error("site.json: links must contain a label and an HTTP(S) url.");
    return { label: link.label, url: link.url };
  });
  if (typeof value.showSampleNotice !== "boolean") throw new Error("site.json: showSampleNotice must be a boolean.");
  return {
    title: requiredText(value.title, "site.json: title"),
    description: requiredText(value.description, "site.json: description"),
    author: requiredText(value.author, "site.json: author"),
    initials: requiredText(value.initials, "site.json: initials"),
    tagline: requiredText(value.tagline, "site.json: tagline"),
    headline: requiredText(value.headline, "site.json: headline"),
    intro: requiredText(value.intro, "site.json: intro"),
    bio: requiredText(value.bio, "site.json: bio"),
    url: value.url,
    interests: value.interests,
    email: value.email,
    links,
    showSampleNotice: value.showSampleNotice,
  };
}

export function validatePosts(value) {
  if (!Array.isArray(value)) throw new Error("posts.json must contain an array.");
  const slugs = new Set();
  const parsed = [];
  let featuredCount = 0;
  for (const [index, post] of value.entries()) {
    const label = `posts.json entry ${index + 1}`;
    if (!record(post)) throw new Error(`${label}: must be an object.`);
    if (!text(post.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) throw new Error(`${label}: invalid slug.`);
    if (slugs.has(post.slug)) throw new Error(`${label}: duplicate slug "${post.slug}".`);
    slugs.add(post.slug);
    const title = requiredText(post.title, `${label}: title`);
    const description = requiredText(post.description, `${label}: description`);
    const body = requiredText(post.body, `${label}: body`);
    if (!isPostType(post.type)) throw new Error(`${label}: type must be Essay, Paper, or Note.`);
    if (!validDate(post.date)) throw new Error(`${label}: date must be a real YYYY-MM-DD date.`);
    if (post.updated !== null && (!validDate(post.updated) || post.updated < post.date)) {
      throw new Error(`${label}: updated must be null or a valid date on or after publication.`);
    }
    if (!stringList(post.tags) || new Set(post.tags).size !== post.tags.length) throw new Error(`${label}: tags must be unique, non-empty strings.`);
    if (typeof post.featured !== "boolean" || typeof post.draft !== "boolean" || typeof post.sample !== "boolean") throw new Error(`${label}: featured, draft, and sample must be booleans.`);
    if (post.pdf !== null && !(httpUrl(post.pdf) || (typeof post.pdf === "string" && /^\/files\/[a-zA-Z0-9._/-]+\.pdf$/.test(post.pdf) && !post.pdf.includes("..")))) {
      throw new Error(`${label}: pdf must be null, an HTTP(S) URL, or a /files/ path ending in .pdf.`);
    }
    if (post.featured && !post.draft) featuredCount++;
    parsed.push({ slug: post.slug, title, type: post.type, date: post.date, updated: post.updated, description, tags: post.tags, featured: post.featured, draft: post.draft, sample: post.sample, pdf: post.pdf, body });
  }
  if (featuredCount > 1) throw new Error("posts.json: only one published entry may be featured.");
  return parsed;
}

export function publishedPosts(posts) {
  return posts.filter((post) => !post.draft).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export function readingTime(body) {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 220));
}

export function formatDate(date, long = false) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function filterPosts(posts, query, type, tag) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return posts.filter((post) => {
    const searchable = [post.title, post.description, post.body, ...post.tags].join(" ").toLocaleLowerCase();
    return (type === "All" || post.type === type) && (!tag || post.tags.includes(tag)) && words.every((word) => searchable.includes(word));
  });
}

export function escapeXml(value) {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]);
}

export function citation(post, site) {
  return `${site.author}. (${post.date.slice(0, 4)}). ${post.title}. ${site.title}. ${site.url.replace(/\/$/, "")}/writing/${post.slug}/`;
}

export function bibtex(post, site) {
  const escape = (value) => value.replace(/[\\{}%&#_$^~]/g, (char) => {
    if (char === "\\") return "\\textbackslash{}";
    if (char === "^") return "\\textasciicircum{}";
    if (char === "~") return "\\textasciitilde{}";
    return `\\${char}`;
  });
  return `@misc{${post.slug},\n  author = {${escape(site.author)}},\n  title = {${escape(post.title)}},\n  year = {${post.date.slice(0, 4)}},\n  month = {${post.date.slice(5, 7)}},\n  howpublished = {${escape(site.title)}},\n  url = {${site.url.replace(/\/$/, "")}/writing/${post.slug}/}\n}\n`;
}
