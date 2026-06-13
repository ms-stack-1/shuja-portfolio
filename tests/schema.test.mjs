/* dataLayer event-schema consistency across the three places it is
   defined or described:
     - main.js        EXPLAIN map (console explanations) + push() call sites
     - colophon.html  the documented schema table
     - llms.txt       the "N-event documented schema" claim

   This is the test that catches schema drift (the historical 12 -> 15
   sync problem) before it ships. */
import { describe, it, assert } from "./harness.mjs";
import { readSite } from "./lib/site.mjs";

const mainJs = readSite("assets/main.js");
const colophon = readSite("colophon.html");
const llms = readSite("llms.txt");

/* Keys of the EXPLAIN object literal in main.js. */
function explainKeys() {
  const block = mainJs.match(/var EXPLAIN\s*=\s*\{([\s\S]*?)\n\s*\};/);
  assert.ok(block, "could not locate EXPLAIN map in main.js");
  const keys = [];
  const re = /^\s*([a-z_][a-z0-9_]*)\s*:/gim;
  let m;
  while ((m = re.exec(block[1]))) keys.push(m[1]);
  return keys;
}

/* First <td> of each data row in the colophon schema table. */
function documentedEvents() {
  const table = colophon.match(/<table[^>]*schema-table[^>]*>([\s\S]*?)<\/table>/i);
  assert.ok(table, "could not locate schema-table in colophon.html");
  const events = [];
  const re = /<tr><td>([a-z_][a-z0-9_]*)<\/td>/gi;
  let m;
  while ((m = re.exec(table[1]))) events.push(m[1]);
  return events;
}

/* Event names actually fired: push("x", ...) and dataLayer.push({event:"x"}). */
function firedEvents() {
  const set = new Set();
  let m;
  const re1 = /\bpush\(\s*"([a-z_][a-z0-9_]*)"/g;
  while ((m = re1.exec(mainJs))) set.add(m[1]);
  const re2 = /dataLayer\.push\(\{\s*event:\s*"([a-z_][a-z0-9_]*)"/g;
  while ((m = re2.exec(mainJs))) set.add(m[1]);
  return [...set];
}

const explain = explainKeys();
const documented = documentedEvents();
const fired = firedEvents();

describe("schema: internal sanity", () => {
  it("EXPLAIN map has entries", () => {
    assert.ok(explain.length >= 15, `only ${explain.length} EXPLAIN keys`);
  });
  it("colophon documents a schema table", () => {
    assert.ok(documented.length >= 15, `only ${documented.length} documented events`);
  });
  it("push call sites were found", () => {
    assert.ok(fired.length >= 10, `only ${fired.length} fired events detected`);
  });
});

describe("schema: cross-file consistency", () => {
  it("every documented event is explained in the console (EXPLAIN)", () => {
    const missing = documented.filter((e) => !explain.includes(e));
    assert.equal(missing.length, 0, "documented but not in EXPLAIN: " + missing.join(", "));
  });

  it("every fired event is explained in the console (EXPLAIN)", () => {
    const missing = fired.filter((e) => !explain.includes(e));
    assert.equal(missing.length, 0, "fired but not in EXPLAIN: " + missing.join(", "));
  });

  it("the documented schema has no duplicate rows", () => {
    assert.equal(new Set(documented).size, documented.length, "duplicate event rows in colophon");
  });

  it("llms.txt event count matches the documented table", () => {
    const m = llms.match(/(\d+)-event documented schema/i);
    assert.ok(m, "llms.txt does not state an N-event documented schema");
    assert.equal(
      Number(m[1]),
      documented.length,
      `llms.txt says ${m[1]} but colophon documents ${documented.length}`
    );
  });
});

describe("schema: the instrumentation additions are wired end to end", () => {
  for (const ev of ["article_read", "poll_view", "roadmap_vote_click"]) {
    it(`${ev} is fired, explained, and documented`, () => {
      assert.ok(fired.includes(ev), `${ev} is never pushed in main.js`);
      assert.ok(explain.includes(ev), `${ev} missing from EXPLAIN`);
      assert.ok(documented.includes(ev), `${ev} missing from the colophon table`);
    });
  }
});
