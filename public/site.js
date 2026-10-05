import { filterPosts } from "/content.mjs";

const archive = document.querySelector("#archive");
if (archive) {
  const count = document.querySelector("#result-count");
  try {
    const response = await fetch("/posts.json");
    if (!response.ok) throw new Error(`Archive data request failed (${response.status}).`);
    const posts = await response.json();
    const list = document.querySelector("#post-list");
    const rows = new Map([...list.children].map((row) => [row.dataset.slug, row]));
    const search = document.querySelector("#search");
    const topic = document.querySelector("#topic");
    const sort = document.querySelector("#sort");
    const buttons = [...document.querySelectorAll("[data-type]")];
    const clear = document.querySelector("#clear-filters");
    const empty = document.querySelector("#empty-state");
    let type = "All";
    for (const control of archive.querySelectorAll("[disabled]")) control.disabled = false;
    function update(writeUrl = true) {
      const filtered = filterPosts(posts, search.value, type, topic.value);
      if (sort.value === "oldest") filtered.reverse();
      for (const row of rows.values()) row.hidden = true;
      for (const post of filtered) { const row = rows.get(post.slug); row.hidden = false; list.append(row); }
      count.textContent = `${filtered.length} ${filtered.length === 1 ? "piece" : "pieces"}${search.value ? ` matching "${search.value}"` : topic.value ? ` in ${topic.value}` : " in the archive"}`;
      clear.hidden = !search.value && !topic.value && type === "All";
      empty.hidden = filtered.length > 0;
      for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.type === type));
      if (writeUrl) {
        const params = new URLSearchParams();
        if (search.value) params.set("q", search.value);
        if (type !== "All") params.set("type", type);
        if (topic.value) params.set("topic", topic.value);
        if (sort.value !== "newest") params.set("sort", sort.value);
        history.replaceState(null, "", `/writing/${params.size ? `?${params}` : ""}`);
      }
    }
    function readUrl() {
      const params = new URLSearchParams(location.search);
      search.value = params.get("q") ?? "";
      const requestedType = params.get("type");
      type = buttons.some((button) => button.dataset.type === requestedType) ? requestedType : "All";
      topic.value = [...topic.options].some((option) => option.value === params.get("topic")) ? params.get("topic") : "";
      sort.value = params.get("sort") === "oldest" ? "oldest" : "newest";
      update(false);
    }
    function reset() { search.value = ""; topic.value = ""; type = "All"; sort.value = "newest"; update(); }
    search.addEventListener("input", () => update());
    topic.addEventListener("change", () => update());
    sort.addEventListener("change", () => update());
    for (const button of buttons) button.addEventListener("click", () => { type = button.dataset.type; update(); });
    clear.addEventListener("click", reset);
    document.querySelector("#reset-archive").addEventListener("click", reset);
    window.addEventListener("popstate", readUrl);
    readUrl();
  } catch (error) {
    console.error("Archive controls could not load:", error);
    count.textContent = "Search is unavailable. All writing is still listed below. Reload to try again.";
  }
}
const copy = document.querySelector("#copy-citation");
if (copy) {
  copy.hidden = false;
  copy.addEventListener("click", async () => {
    const status = document.querySelector("#action-status");
    try {
      await navigator.clipboard.writeText(document.querySelector("#citation").textContent);
      status.textContent = "Citation copied.";
    } catch (error) {
      console.error("Clipboard unavailable:", error);
      status.textContent = "Clipboard unavailable. Select and copy the citation above.";
    }
  });
}
const print = document.querySelector("#print-article");
if (print) { print.hidden = false; print.addEventListener("click", () => window.print()); }
