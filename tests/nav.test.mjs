/* Navigation + footer consistency across the whole site, including the
   correct relative prefix per directory depth and the active-link state.
   This locks the "Blog + Roadmap nav links across all pages" change. */
import { describe, it, assert } from "./harness.mjs";
import { htmlPages, navBlock, footerBlock } from "./lib/site.mjs";

const pages = htmlPages();

const NAV_TARGETS = [
  "index.html",
  "work/index.html",
  "projects.html",
  "blog/index.html",
  "roadmap.html",
  "about.html",
  "colophon.html",
  "contact.html",
];

const FOOTER_TARGETS = [
  "work/index.html",
  "blog/index.html",
  "roadmap.html",
  "about.html",
  "colophon.html",
];

// Page that should show as the active nav item, keyed by its own rel path.
const PRIMARY_SELF = {
  "index.html": "index.html",
  "work/index.html": "work/index.html",
  "projects.html": "projects.html",
  "blog/index.html": "blog/index.html",
  "roadmap.html": "roadmap.html",
  "about.html": "about.html",
  "colophon.html": "colophon.html",
  "contact.html": "contact.html",
};

function prefixFor(rel) {
  if (rel === "404.html") return "/"; // 404 is served from any depth -> absolute
  return rel.includes("/") ? "../" : "";
}

describe("nav: links present with correct relative prefix", () => {
  for (const p of pages) {
    const prefix = prefixFor(p.rel);
    const nav = navBlock(p.html);
    const foot = footerBlock(p.html);

    it(`${p.rel}: nav contains all 8 destinations`, () => {
      for (const t of NAV_TARGETS) {
        const href = `href="${prefix}${t}"`;
        assert.ok(nav.includes(href), `${p.rel}: nav missing ${href}`);
      }
    });

    it(`${p.rel}: footer contains case studies, blog, roadmap, about, colophon`, () => {
      for (const t of FOOTER_TARGETS) {
        const href = `href="${prefix}${t}"`;
        assert.ok(foot.includes(href), `${p.rel}: footer missing ${href}`);
      }
      assert.match(foot, /linkedin\.com\/in\/mshujasid/i, "footer missing LinkedIn");
      assert.ok(foot.includes(`href="${prefix}resume.json"`), "footer missing resume.json");
      assert.ok(foot.includes(`href="${prefix}llms.txt"`), "footer missing llms.txt");
    });
  }
});

describe("nav: active-link state", () => {
  for (const p of pages) {
    const nav = navBlock(p.html);
    const activeCount = (nav.match(/class="active"/g) || []).length;

    it(`${p.rel}: at most one active nav link`, () => {
      assert.ok(activeCount <= 1, `${p.rel}: ${activeCount} active links`);
    });

    if (PRIMARY_SELF[p.rel]) {
      const prefix = prefixFor(p.rel);
      const self = PRIMARY_SELF[p.rel];
      it(`${p.rel}: marks its own nav link active`, () => {
        const re = new RegExp(
          `href="${prefix.replace(/[/]/g, "\\/")}${self.replace(/[/.]/g, (c) => "\\" + c)}"[^>]*class="active"`
        );
        assert.match(nav, re, `${p.rel}: own link not marked active`);
      });
    }
  }
});
