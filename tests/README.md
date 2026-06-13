# Tests

A dependency-free test suite for the public site in `site/`. No test
framework and no `node_modules`: a small hand-rolled harness plus the
built-in `node:assert/strict`, matching the zero-dependency philosophy of
the rest of the project.

## Running

Requires Node 18+ (for the built-in assert and the test entry point).

```
npm test
# or
node tests/run.mjs
```

Exit code is non-zero if any test fails, so it drops straight into CI.

## What is covered

| File | Area |
|------|------|
| `structure.test.mjs` | Doctype, lang, charset, single `<main>`/`<h1>`, balanced landmarks, the GTM block, unique `data-page` ids |
| `meta.test.mjs` | Title, meta description, canonical, Open Graph set, Twitter card, favicon, Person and Article JSON-LD validity |
| `assets.test.mjs` | Core assets exist; headshot regression guard (no `headshot.jpg`, every reference is `headshot.webp`) |
| `links.test.mjs` | Every local `href`/`src` resolves to a real file; off-domain links use https |
| `nav.test.mjs` | Nav and footer destinations on every page, correct relative prefix per depth, single active link |
| `schema.test.mjs` | dataLayer event schema is consistent across `main.js` (EXPLAIN + push sites), the colophon table, and the `llms.txt` count |
| `seo.test.mjs` | `sitemap.xml`, `llms.txt`, `robots.txt`, `resume.json` parse, are consistent, and only point at files that exist |
| `behavior.test.mjs` | Loads `main.js` in a minimal DOM stub: boots without throwing, consent gates the dataLayer, the CAC/ROAS calculator math is correct |

## How the behavior tests work

`behavior.test.mjs` runs the real `site/assets/main.js` against
`lib/dom-stub.mjs`, a minimal browser environment that implements only the
slice of the DOM the script touches. No jsdom, no headless browser. This
keeps the suite fast and dependency-free while still exercising the live
consent gate and calculator logic, not a reimplementation of them.

## Note

The suite tests the public `site/` directory only. It lives at the repo
root (not under `site/`) so it is version-controlled with the project but
never deployed.
