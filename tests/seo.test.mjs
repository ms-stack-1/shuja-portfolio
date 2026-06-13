/* Machine-readable surface: sitemap.xml, llms.txt, robots.txt, resume.json.
   Validates they parse, are internally consistent, and only point at files
   that exist. */
import { describe, it, assert } from "./harness.mjs";
import { readSite, htmlPages, exists, SITE, DOMAIN } from "./lib/site.mjs";
import { join } from "node:path";

const pages = htmlPages();

/* Normalize a site URL path to a site-relative file path.
   "/" -> "index.html", "/work/index.html" -> "work/index.html". */
function toRel(path) {
  let p = path;
  if (p.startsWith(DOMAIN)) p = p.slice(DOMAIN.length);
  if (p === "/" || p === "") return "index.html";
  return p.replace(/^\//, "");
}

describe("sitemap.xml", () => {
  const xml = readSite("sitemap.xml");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it("is well-formed and namespaced", () => {
    assert.match(xml.trimStart(), /^<\?xml/);
    assert.match(xml, /<urlset[^>]*sitemaps\.org\/schemas\/sitemap/);
    assert.equal((xml.match(/<url>/g) || []).length, (xml.match(/<\/url>/g) || []).length);
  });

  it("has entries and they are unique", () => {
    assert.ok(locs.length >= 14, `only ${locs.length} sitemap entries`);
    assert.equal(new Set(locs).size, locs.length, "duplicate <loc> entries");
  });

  it("every <loc> resolves to an existing file", () => {
    for (const loc of locs) {
      const rel = toRel(loc);
      assert.ok(exists(join(SITE, rel)), `sitemap entry has no file: ${loc} -> ${rel}`);
    }
  });

  it("every page except 404 is listed", () => {
    const listed = new Set(locs.map(toRel));
    const missing = pages
      .filter((p) => p.rel !== "404.html")
      .filter((p) => !listed.has(p.rel))
      .map((p) => p.rel);
    assert.equal(missing.length, 0, "pages missing from sitemap: " + missing.join(", "));
  });

  it("does not list the 404 page", () => {
    const listed = new Set(locs.map(toRel));
    assert.ok(!listed.has("404.html"), "404.html should not be in the sitemap");
  });
});

describe("llms.txt", () => {
  const txt = readSite("llms.txt");

  it("has a ## Pages section", () => {
    assert.match(txt, /^##\s+Pages\s*$/m);
  });

  it("every listed page path exists", () => {
    const after = txt.slice(txt.indexOf("## Pages"));
    const paths = [...after.matchAll(/^-\s+(\/[^\s:]+):/gm)].map((m) => m[1]);
    assert.ok(paths.length >= 14, `only ${paths.length} pages listed`);
    for (const p of paths) {
      const rel = p.replace(/^\//, "");
      assert.ok(exists(join(SITE, rel)), `llms.txt lists a missing page: ${p}`);
    }
  });

  it("lists the blog index and roadmap", () => {
    assert.match(txt, /^-\s+\/blog\/index\.html:/m);
    assert.match(txt, /^-\s+\/roadmap\.html:/m);
  });
});

describe("robots.txt", () => {
  const txt = readSite("robots.txt");
  it("points at the sitemap", () => {
    assert.match(txt, /Sitemap:\s*\S*sitemap\.xml/i);
  });
  it("does not block the whole site", () => {
    assert.ok(!/^\s*Disallow:\s*\/\s*$/im.test(txt), "robots.txt disallows everything");
    assert.match(txt, /Allow:\s*\//i);
  });
});

describe("resume.json", () => {
  const raw = readSite("resume.json");
  it("is valid JSON", () => {
    JSON.parse(raw); // throws on malformed
  });
  it("has the expected identity and sections", () => {
    const r = JSON.parse(raw);
    assert.equal(r.basics.name, "Muhammad Shuja");
    assert.ok(r.basics.email && r.basics.email.includes("@"), "missing email");
    for (const key of ["work", "education", "skills"]) {
      assert.ok(Array.isArray(r[key]) && r[key].length > 0, `resume ${key} empty`);
    }
  });
});
