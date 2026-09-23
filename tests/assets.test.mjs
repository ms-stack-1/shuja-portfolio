/* Asset existence + the headshot regression guard.

   The headshot bug was: pages referenced assets/headshot.jpg but only
   headshot.webp exists. These tests lock the fix so it cannot regress. */
import { describe, it, assert } from "./harness.mjs";
import { htmlPages, readSite, exists, ASSETS, DOMAIN, metaProperty } from "./lib/site.mjs";
import { join as pjoin } from "node:path";
import { readFileSync } from "node:fs";

const pages = htmlPages();

describe("assets: core files exist", () => {
  const required = [
    "styles.css",
    "main.js",
    "favicon.svg",
    "resume.pdf",
    "headshot.webp",
    "og-card.jpg",
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

  /* og:image is deliberately NOT the webp. LinkedIn's crawler is unreliable
     with WebP and aborts the preview, so the share card is a 1200x630 JPEG
     while headshot.webp stays the on-page image. */
  it("every og:image points at the JPEG share card", () => {
    for (const p of pages) {
      const og = metaProperty(p.html, "og:image");
      assert.ok(og, `${p.rel}: missing og:image`);
      assert.match(og, /\/assets\/og-card\.jpg$/, `${p.rel}: og:image not the jpg card -> ${og}`);
    }
  });

  it("every og:image is an absolute URL on this domain", () => {
    for (const p of pages) {
      const og = metaProperty(p.html, "og:image");
      assert.ok(og.startsWith(DOMAIN + "/"), `${p.rel}: og:image not absolute on ${DOMAIN} -> ${og}`);
    }
  });

  it("every page declares og:image dimensions, alt and site_name", () => {
    for (const p of pages) {
      assert.equal(metaProperty(p.html, "og:image:width"), "1200", `${p.rel}: bad og:image:width`);
      assert.equal(metaProperty(p.html, "og:image:height"), "630", `${p.rel}: bad og:image:height`);
      assert.ok(metaProperty(p.html, "og:image:alt"), `${p.rel}: missing og:image:alt`);
      assert.ok(metaProperty(p.html, "og:site_name"), `${p.rel}: missing og:site_name`);
    }
  });

  it("the share card is a 1200x630 JPEG", () => {
    const buf = readFileSync(pjoin(ASSETS, "og-card.jpg"));
    assert.equal(buf[0], 0xff, "og-card.jpg is not a JPEG (bad SOI)");
    assert.equal(buf[1], 0xd8, "og-card.jpg is not a JPEG (bad SOI)");
    let i = 2, w = 0, h = 0;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break;
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    assert.equal(w, 1200, `og-card.jpg width ${w}`);
    assert.equal(h, 630, `og-card.jpg height ${h}`);
  });
});

/* The dead-domain regression: shuja.gridbyteops.com does not resolve, and
   LinkedIn aborts the preview when og:image cannot be fetched. */
describe("assets: no dead domain in metadata", () => {
  it("no page references gridbyteops.com", () => {
    const offenders = pages.filter((p) => p.html.includes("gridbyteops.com"));
    assert.equal(offenders.length, 0,
      "dead domain still present: " + offenders.map((p) => p.rel).join(", "));
  });
});

/* Cloudflare Pages 308-redirects /foo.html -> /foo and /dir/index.html -> /dir/.
   If canonical/og:url still carry .html they point at a redirect, and LinkedIn
   refuses to build a preview rather than follow it. */
describe("assets: canonical URLs match what the host serves", () => {
  it("no canonical or og:url ends in .html", () => {
    for (const p of pages) {
      const can = (p.html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
      const ogu = metaProperty(p.html, "og:url");
      assert.ok(can, `${p.rel}: missing canonical`);
      assert.ok(!/\.html$/.test(can), `${p.rel}: canonical points at a redirect -> ${can}`);
      assert.ok(!/\.html$/.test(ogu), `${p.rel}: og:url points at a redirect -> ${ogu}`);
    }
  });

  it("canonical and og:url agree on every page", () => {
    for (const p of pages) {
      const can = (p.html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
      assert.equal(metaProperty(p.html, "og:url"), can, `${p.rel}: og:url != canonical`);
    }
  });

  it("no sitemap <loc> ends in .html", () => {
    const xml = readSite("sitemap.xml");
    const bad = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /\.html$/.test(u));
    assert.equal(bad.length, 0, "sitemap URLs point at redirects: " + bad.join(", "));
  });
});
