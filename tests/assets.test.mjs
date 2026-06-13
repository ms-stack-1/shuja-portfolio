/* Asset existence + the headshot regression guard.

   The headshot bug was: pages referenced assets/headshot.jpg but only
   headshot.webp exists. These tests lock the fix so it cannot regress. */
import { describe, it, assert } from "./harness.mjs";
import { htmlPages, readSite, exists, ASSETS, metaProperty } from "./lib/site.mjs";
import { join as pjoin } from "node:path";

const pages = htmlPages();

describe("assets: core files exist", () => {
  const required = [
    "styles.css",
    "main.js",
    "favicon.svg",
    "resume.pdf",
    "headshot.webp",
  ];
  for (const f of required) {
    it(`assets/${f} exists`, () => {
      assert.ok(exists(pjoin(ASSETS, f)), `missing site/assets/${f}`);
    });
  }
  it("the old headshot.jpg has been removed", () => {
    assert.ok(!exists(pjoin(ASSETS, "headshot.jpg")), "stale headshot.jpg still present");
  });
});

describe("assets: headshot reference regression", () => {
  it("no page references headshot.jpg anywhere", () => {
    const offenders = pages.filter((p) => p.html.includes("headshot.jpg"));
    assert.equal(
      offenders.length,
      0,
      "still referencing headshot.jpg: " + offenders.map((p) => p.rel).join(", ")
    );
  });

  it("the homepage <img> uses headshot.webp", () => {
    const html = readSite("index.html");
    const m = html.match(/<img[^>]*src\s*=\s*"([^"]*headshot[^"]*)"/i);
    assert.ok(m, "no headshot <img> on the homepage");
    assert.match(m[1], /headshot\.webp$/);
  });

  it("every og:image points at headshot.webp", () => {
    for (const p of pages) {
      const og = metaProperty(p.html, "og:image");
      assert.ok(og, `${p.rel}: missing og:image`);
      assert.match(og, /headshot\.webp$/, `${p.rel}: og:image not webp -> ${og}`);
    }
  });
});
