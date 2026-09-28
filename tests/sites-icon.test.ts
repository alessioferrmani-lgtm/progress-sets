import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("iOS usa l’icona pubblica immutabile senza esporre il database del Site privato", () => {
  const root = readFileSync("src/routes/__root.tsx", "utf8");
  assert.match(
    root,
    /rel: "apple-touch-icon",[\s\S]*?href: "https:\/\/raw\.githubusercontent\.com\/alessioferrmani-lgtm\/progress-sets\/[a-f0-9]{40}\/public\/progress-sets-track-flame-apple-touch-icon\.png"/,
  );
  assert.match(root, /crossOrigin: "use-credentials"/);
  const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
  assert.equal(manifest.start_url, "/home");
  assert.equal(manifest.icons.length, 3);
  for (const icon of manifest.icons)
    assert.match(
      icon.src,
      /^https:\/\/raw\.githubusercontent\.com\/alessioferrmani-lgtm\/progress-sets\/[a-f0-9]{40}\/public\/progress-sets-track-flame-icon-/,
    );
});
