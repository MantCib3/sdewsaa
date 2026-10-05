import { escapeXml } from "./content.mjs";

export function safeUrl(value, image = false) {
  if (/^\/(?!\/)/.test(value) || /^#[a-zA-Z0-9_-]+$/.test(value)) return escapeXml(value);
  try {
    const url = new URL(value);
    if (["https:", "http:", ...(image ? [] : ["mailto:"])].includes(url.protocol)) return escapeXml(value);
  } catch {
    throw new Error(`Invalid Markdown URL: ${value}. Use an absolute HTTPS URL or a root-relative path.`);
  }
  throw new Error(`Unsupported Markdown URL protocol: ${value}`);
}

export function inline(value) {
  const tokens = [];
  const token = (html) => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
  let output = value.replace(/`([^`]+)`|!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)/g, (_, code, alt, imageUrl, label, url) => {
    if (code !== undefined) return token(`<code>${escapeXml(code)}</code>`);
    if (imageUrl !== undefined) return token(`<img src="${safeUrl(imageUrl, true)}" alt="${escapeXml(alt)}" loading="lazy">`);
    return token(`<a href="${safeUrl(url)}">${inline(label)}</a>`);
  });
  output = escapeXml(output);
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return output.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
}

export function markdown(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  const toc = [];
  const ids = new Map();
  const boundary = (line) => /^(?:#{1,6} |```|> ?|[-*] |\d+\. |---+$)/.test(line);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      if (i === lines.length) throw new Error("Unclosed Markdown code fence.");
      i++;
      output.push(`<pre><code>${escapeXml(code.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^(#{1,6}) (.+)$/);
    if (heading) {
      const label = heading[2].replace(/[*`]/g, "");
      const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
      const count = ids.get(base) ?? 0;
      ids.set(base, count + 1);
      const id = count ? `${base}-${count + 1}` : base;
      output.push(`<h${heading[1].length} id="${id}">${inline(heading[2])}</h${heading[1].length}>`);
      if (heading[1].length === 2) toc.push({ label, id });
      i++;
      continue;
    }
    if (/^---+$/.test(line)) { output.push("<hr>"); i++; continue; }
    if (line.startsWith(">")) {
      const quotes = [];
      while (i < lines.length && lines[i].startsWith(">")) quotes.push(lines[i++].replace(/^> ?/, ""));
      output.push(`<blockquote>${markdown(quotes.join("\n")).html}</blockquote>`);
      continue;
    }
    if (/^(?:[-*] |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const pattern = ordered ? /^\d+\. / : /^[-*] /;
      const items = [];
      while (i < lines.length && pattern.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(pattern, ""))}</li>`);
      output.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    if (line.includes("|") && lines[i + 1] && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
      const headers = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        const row = cells(lines[i++]);
        if (row.length !== headers.length) throw new Error("Markdown table row has a different number of cells from its header.");
        rows.push(`<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`);
      }
      output.push(`<div class="table-scroll" tabindex="0" role="region" aria-label="Data table"><table><thead><tr>${headers.map((cell) => `<th scope="col">${inline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`);
      continue;
    }
    const paragraph = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !boundary(lines[i])) paragraph.push(lines[i++]);
    output.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }
  return { html: output.join("\n"), toc };
}
