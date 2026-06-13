/* SEO / social / structured-data metadata on every page. */
import { describe, it, assert } from "./harness.mjs";
import {
  htmlPages,
  titleText,
  metaName,
  metaProperty,
  jsonLdBlocks,
  DOMAIN,
} from "./lib/site.mjs";

const pages = htmlPages();

describe("meta: head tags per page", () => {
  for (const p of pages) {
    describe(`meta: ${p.rel}`, () => {
      const html = p.html;

      it("has a non-empty <title>", () => {
        const t = titleText(html);
        assert.ok(t && t.length > 0, "missing/empty title");
      });

      it("has a non-empty meta description", () => {
        const d = metaName(html, "description");
        // The 404 page intentionally carries a terse description.
        const minLen = p.rel === "404.html" ? 1 : 20;
        assert.ok(d && d.length >= minLen, "missing or too-short meta description");
      });

      it("has a canonical link on this domain", () => {
        const m = html.match(/<link[^>]*rel\s*=\s*"canonical"[^>]*href\s*=\s*"([^"]+)"/i);
        assert.ok(m, "missing canonical link");
        assert.ok(m[1].startsWith(DOMAIN), `canonical not on ${DOMAIN}: ${m[1]}`);
      });

      it("has the Open Graph quartet (type/title/description/image/url)", () => {
        for (const prop of ["og:type", "og:title", "og:description", "og:image", "og:url"]) {
          const v = metaProperty(html, prop);
          assert.ok(v && v.length > 0, `missing ${prop}`);
        }
      });

      it("og:url and canonical agree", () => {
        const canon = html.match(/rel\s*=\s*"canonical"[^>]*href\s*=\s*"([^"]+)"/i)[1];
        const ogUrl = metaProperty(html, "og:url");
        assert.equal(ogUrl, canon, "og:url should equal canonical");
      });

      it("declares a twitter card and favicon", () => {
        assert.ok(metaName(html, "twitter:card"), "missing twitter:card");
        assert.match(html, /<link[^>]*rel\s*=\s*"icon"[^>]*favicon\.svg/i);
      });

      it("carries a valid Person JSON-LD block", () => {
        const blocks = jsonLdBlocks(html);
        assert.ok(blocks.length >= 1, "no JSON-LD blocks");
        const parsed = blocks.map((b) => JSON.parse(b)); // throws on malformed
        const person = parsed.find((o) => o["@type"] === "Person");
        assert.ok(person, "no Person JSON-LD");
        assert.equal(person["@context"], "https://schema.org");
        assert.equal(person.name, "Muhammad Shuja");
      });
    });
  }
});

describe("meta: blog posts carry Article structured data", () => {
  const posts = pages.filter(
    (p) => p.rel.startsWith("blog/") && p.rel !== "blog/index.html"
  );
  it("there is at least one blog post", () => {
    assert.ok(posts.length >= 1);
  });
  for (const p of posts) {
    it(`${p.rel} has Article JSON-LD with headline + datePublished`, () => {
      const parsed = jsonLdBlocks(p.html).map((b) => JSON.parse(b));
      const article = parsed.find((o) => o["@type"] === "Article");
      assert.ok(article, "no Article JSON-LD");
      assert.ok(article.headline, "Article missing headline");
      assert.match(article.datePublished || "", /^\d{4}-\d{2}-\d{2}$/);
    });
  }
});
