/* HTML structural sanity: every page is a well-formed document with the
   shared scaffold (doctype, lang, charset, single main, balanced landmark
   tags, the GTM block, a unique data-page id). */
import { describe, it, assert } from "./harness.mjs";
import { htmlPages, navBlock, footerBlock, countOccurrences, GTM_ID } from "./lib/site.mjs";

const pages = htmlPages();

describe("structure: every HTML page", () => {
  it("has at least one page", () => {
    assert.ok(pages.length >= 16, `expected 16+ pages, found ${pages.length}`);
  });

  for (const p of pages) {
    describe(`structure: ${p.rel}`, () => {
      const html = p.html;

      it("starts with an HTML5 doctype", () => {
        assert.match(html.trimStart().slice(0, 80), /^<!doctype html>/i);
      });

      it('declares <html lang="en">', () => {
        assert.match(html, /<html[^>]*lang\s*=\s*"en"/i);
      });

      it("declares a UTF-8 charset", () => {
        assert.match(html, /<meta[^>]*charset\s*=\s*"utf-8"/i);
      });

      it("has a body with a data-page attribute", () => {
        assert.match(html, /<body[^>]*data-page\s*=\s*"[^"]+"/i);
      });

      it("has exactly one <h1>", () => {
        assert.equal(countOccurrences(html, "<h1"), 1);
      });

      it("has exactly one <main> element", () => {
        assert.equal(countOccurrences(html, "<main"), 1);
        assert.equal(countOccurrences(html, "</main>"), 1);
      });

      it("has a balanced single <nav> and <footer>", () => {
        assert.equal(countOccurrences(html, "<nav"), countOccurrences(html, "</nav>"));
        assert.ok(countOccurrences(html, "<nav") >= 1, "missing <nav>");
        assert.equal(countOccurrences(html, "<footer"), countOccurrences(html, "</footer>"));
        assert.ok(countOccurrences(html, "<footer") >= 1, "missing <footer>");
        assert.ok(navBlock(html).length > 0, "nav block not extractable");
        assert.ok(footerBlock(html).length > 0, "footer block not extractable");
      });

      it("embeds the GTM container block", () => {
        assert.ok(
          countOccurrences(html, GTM_ID) >= 2,
          `expected the GTM placeholder ${GTM_ID} at least twice`
        );
        assert.match(html, /googletagmanager\.com\/gtm\.js/i);
        assert.match(html, /<noscript>[\s\S]*googletagmanager\.com\/ns\.html/i);
      });

      it("loads the shared stylesheet and script", () => {
        assert.match(html, /<link[^>]*rel\s*=\s*"stylesheet"[^>]*href\s*=\s*"[^"]*assets\/styles\.css"/i);
        assert.match(html, /<script[^>]*src\s*=\s*"[^"]*assets\/main\.js"/i);
      });
    });
  }
});

describe("structure: cross-page", () => {
  it("every page has a unique data-page id", () => {
    const seen = new Map();
    for (const p of pages) {
      const m = p.html.match(/<body[^>]*data-page\s*=\s*"([^"]+)"/i);
      assert.ok(m, `${p.rel}: no data-page`);
      const id = m[1];
      assert.ok(!seen.has(id), `duplicate data-page "${id}" in ${p.rel} and ${seen.get(id)}`);
      seen.set(id, p.rel);
    }
  });
});
