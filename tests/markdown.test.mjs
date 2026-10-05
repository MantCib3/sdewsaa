import { test } from "node:test";
import assert from "node:assert/strict";
import { markdown, inline } from "../src/lib/markdown.mjs";

test("renders headings, lists, quotes, tables, links and code", () => {
  const { html, toc } = markdown("## One\n\n**Bold** and *italic* [link](https://example.com).\n\n- Item\n- Other\n\n> Quoted\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```js\nconst x = '<';\n```");
  for (const part of ["<h2", "<strong>Bold", "<em>italic", "<a href=", "<ul>", "<blockquote>", "<table>", "&lt;"]) assert.ok(html.includes(part), part);
  assert.deepEqual(toc, [{ label: "One", id: "one" }]);
});
test("escapes HTML, attributes, code and rejects unsafe links", () => {
  assert.equal(inline("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.ok(inline('![a"b](/image.png)').includes("a&quot;b"));
  assert.throws(() => inline("[bad](javascript:alert)"), /protocol/);
  assert.throws(() => inline("![bad](data:image)"), /protocol/);
  assert.equal(inline("[a `code`](https://example.com)"), '<a href="https://example.com">a <code>code</code></a>');
  assert.equal(inline("`[not a link](javascript:alert)`"), "<code>[not a link](javascript:alert)</code>");
});
test("unique heading IDs and explicit malformed content errors", () => {
  assert.deepEqual(markdown("## Repeat\n\n## Repeat").toc.map((item) => item.id), ["repeat", "repeat-2"]);
  assert.throws(() => markdown("```\nmissing close"), /Unclosed/);
  assert.throws(() => markdown("| A | B |\n| --- | --- |\n| Only one |"), /cells/);
});
