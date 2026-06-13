/* Internal link integrity: every local href/src on every page must
   resolve to a file that actually exists. This is the broad net that
   catches dead nav links, moved assets, and bad relative prefixes. */
import { describe, it, assert } from "./harness.mjs";
import { htmlPages, linkRefs, resolveLink, exists } from "./lib/site.mjs";

const pages = htmlPages();

describe("links: no broken internal references", () => {
  for (const p of pages) {
    it(`${p.rel} has no dead local links`, () => {
      const refs = linkRefs(p.html);
      const broken = [];
      for (const ref of refs) {
        const target = resolveLink(p.abs, ref);
        if (target === null) continue; // external / mailto / tel / anchor
        if (!exists(target)) broken.push(ref);
      }
      assert.equal(
        broken.length,
        0,
        `${p.rel}: broken local link(s): ${broken.join(", ")}`
      );
    });
  }
});

describe("links: external links are safe", () => {
  for (const p of pages) {
    it(`${p.rel} uses https for off-domain links`, () => {
      const bad = linkRefs(p.html).filter((r) => /^http:\/\//i.test(r));
      assert.equal(bad.length, 0, `${p.rel}: insecure http link(s): ${bad.join(", ")}`);
    });
  }
});
