import { watch } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
function build() {
  const result = spawnSync(process.execPath, ["scripts/build.mjs"], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status === 0;
}
if (!build()) process.exit(1);
await import("./preview.mjs");
let timer;
for (const directory of ["src", "public"]) {
  watch(new URL(`../${directory}/`, import.meta.url), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (!build()) console.error("Rebuild failed. Fix the reported content error and save again."); }, 250);
  });
}
console.log("Watching content and styles. Refresh your browser after a save.");
