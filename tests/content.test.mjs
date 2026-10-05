import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bibtex, citation, escapeXml, filterPosts, formatDate, publishedPosts, readingTime, validatePosts, validateSite } from "../src/lib/content.mjs";

const data = JSON.parse(readFileSync(new URL("../src/data/posts.json", import.meta.url), "utf8"));
const config = JSON.parse(readFileSync(new URL("../src/data/site.json", import.meta.url), "utf8"));
const posts = validatePosts(data);
const site = validateSite(config);
const base = posts[0];

test("sample content is valid and contains all formats", () => {
  assert.equal(posts.length, 6);
  assert.deepEqual(new Set(posts.map((post) => post.type)), new Set(["Essay", "Paper", "Note"]));
  assert.equal(posts.every((post) => post.sample), true);
});

test("drafts stay out of the public collection and entries are newest first", () => {
  const published = publishedPosts([posts[2], { ...base, draft: true }, posts[1]]);
  assert.deepEqual(published.map((post) => post.slug), [posts[1].slug, posts[2].slug]);
});

test("search matches title, body and tags; combines filters and words", () => {
  assert.equal(filterPosts(posts, "slow thinking", "All", "").length, 1);
  assert.equal(filterPosts(posts, "measurement register", "Paper", "Research").length, 1);
  assert.equal(filterPosts(posts, " SLOW THINKING ", "All", "").length, 1);
  assert.equal(filterPosts(posts, "", "All", "Knowledge").length, 2);
  assert.equal(filterPosts(posts, "measurement", "Note", "").length, 0);
  assert.equal(filterPosts(posts, "not-a-real-word", "All", "").length, 0);
  assert.equal(filterPosts(posts, "", "All", "").length, posts.length);
});

test("validation rejects invalid dates, duplicates, and malformed fields", () => {
  assert.throws(() => validatePosts([{ ...base, date: "2026-02-30" }]), /real YYYY-MM-DD/);
  assert.throws(() => validatePosts([base, base]), /duplicate slug/);
  assert.throws(() => validatePosts([{ ...base, slug: "../bad" }]), /invalid slug/);
  assert.throws(() => validatePosts([{ ...base, type: "Book" }]), /type must be/);
  assert.throws(() => validatePosts([{ ...base, updated: "2020-01-01" }]), /on or after/);
  assert.throws(() => validatePosts([{ ...base, featured: "true" }]), /must be booleans/);
  assert.throws(() => validatePosts([{ ...base, body: "" }]), /non-empty string/);
  assert.throws(() => validatePosts([{ ...base, tags: ["A", "A"] }]), /unique/);
  assert.throws(() => validatePosts([base, { ...posts[1], featured: true }]), /only one/);
});

test("PDF paths and site URLs are validated", () => {
  assert.throws(() => validatePosts([{ ...base, pdf: "javascript:alert(1)" }]), /pdf must be/);
  assert.throws(() => validatePosts([{ ...base, pdf: "/files/../secret.pdf" }]), /pdf must be/);
  assert.equal(validatePosts([{ ...base, pdf: "/files/paper.pdf" }])[0].pdf, "/files/paper.pdf");
  assert.equal(validatePosts([{ ...base, pdf: "https://example.com/paper.pdf" }])[0].pdf, "https://example.com/paper.pdf");
  assert.throws(() => validateSite({ ...site, url: "https://example.com/subpath" }), /origin/);
  assert.throws(() => validateSite({ ...site, email: "invalid" }), /email/);
  assert.throws(() => validateSite({ ...site, links: [{ label: "Bad", url: "javascript:alert(1)" }] }), /HTTP/);
});

test("reading times and display dates are stable", () => {
  assert.equal(readingTime("word"), 1);
  assert.equal(readingTime(Array(221).fill("word").join(" ")), 2);
  assert.equal(formatDate("2026-09-28"), "Sep 28, 2026");
});

test("XML and BibTeX escaping preserve output safety", () => {
  assert.equal(escapeXml(`<a title="A & B">'x'</a>`), "&lt;a title=&quot;A &amp; B&quot;&gt;&apos;x&apos;&lt;/a&gt;");
  assert.match(bibtex({ ...base, title: "A {test} & 50%" }, site), /A \\\{test\\\} \\& 50\\%/);
  assert.match(citation(base, site), /https:\/\/example.com\/writing\/the-case-for-slow-thinking\//);
});

test("empty archives are supported", () => {
  assert.deepEqual(validatePosts([]), []);
  assert.deepEqual(publishedPosts([]), []);
  assert.deepEqual(filterPosts([], "", "All", ""), []);
});
