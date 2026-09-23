/* Funnel stage engine: the promotion rules that drive the visitor dock.

   The concept only works if the stage is earned. These tests exist to stop
   the model drifting into decoration - especially the rule that dwell time
   never promotes anyone. */
import { describe, it, assert } from "./harness.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/site.mjs";

const src = readFileSync(join(ROOT, "site", "assets", "main.js"), "utf8");

/* stageOf is a pure function of the signal object, so it can be lifted out
   and exercised directly without booting the whole script. */
const fn = src.match(/function stageOf\(sig\)[\s\S]*?\n  \}/);
const stageOf = fn ? new Function(fn[0] + "; return stageOf;")() : null;

const sig = (o) => Object.assign(
  { pages: [], cases: 0, depth: 0, contact: false, resume: false, calc: false, converted: false },
  o
);

describe("funnel: stage promotion", () => {
  it("stageOf is present and liftable", () => {
    assert.ok(stageOf, "stageOf not found in main.js");
  });

  const cases = [
    ["a fresh arrival is Awareness", sig({ pages: ["home"] }), 1],
    ["scrolling under half way does not promote", sig({ pages: ["home"], depth: 30 }), 1],
    ["half the page is Interest", sig({ pages: ["home"], depth: 50 }), 2],
    ["a second page is Interest", sig({ pages: ["home", "work"] }), 2],
    ["one case study is Interest", sig({ pages: ["home", "c"], cases: 1 }), 2],
    ["one case read deeply is Consideration", sig({ pages: ["h", "c"], cases: 1, depth: 75 }), 3],
    ["two case studies is Consideration", sig({ pages: ["a", "b", "c"], cases: 2 }), 3],
    ["using the CAC model is Intent", sig({ pages: ["h", "b"], cases: 1, calc: true }), 4],
    ["reaching contact is Intent", sig({ pages: ["h", "contact"], contact: true }), 4],
    ["clicking a contact CTA is Conversion", sig({ pages: ["h"], converted: true }), 5],
    ["pulling the resume is Conversion", sig({ pages: ["h"], resume: true }), 5],
  ];
  for (const [name, s, want] of cases) {
    it(name, () => assert.equal(stageOf(s), want));
  }

  /* The load-bearing honesty rule. If this ever fails the dock has become a
     timer, and the whole "your stage is earned" claim is false. */
  it("time on site never promotes on its own", () => {
    assert.equal(stageOf(sig({ pages: ["home"] })), 1, "an idle visitor left Awareness");
  });

  it("two of five stages are reachable without any scrolling", () => {
    assert.equal(stageOf(sig({ pages: ["h"], contact: true })), 4);
    assert.equal(stageOf(sig({ pages: ["h"], resume: true })), 5);
  });
});

describe("funnel: wiring hazards", () => {
  /* push -> runSegmentation -> updateStage -> push would recurse forever. */
  it("runSegmentation ignores its own funnel_stage event", () => {
    assert.match(src, /function runSegmentation[\s\S]{0,400}?event === "funnel_stage"[\s\S]{0,40}?return;/,
      "no recursion guard at the top of runSegmentation");
  });

  /* A cta_click changes nothing else, so a conversion rule placed after the
     `if (!changed) return;` early exit would be dead code. */
  it("the conversion signal is set before the early return", () => {
    const body = src.slice(src.indexOf("function runSegmentation"));
    const convert = body.indexOf('event === "cta_click"');
    const bail = body.indexOf("if (!changed) return;");
    assert.ok(convert > -1, "no cta_click rule in runSegmentation");
    assert.ok(convert < bail, "cta_click rule sits after the early return and can never run");
  });

  /* Stage events must inherit the consent gate. Pushing them straight to the
     dataLayer would bypass it, on the site whose argument is that it does not. */
  it("stage events route through push(), inheriting the consent gate", () => {
    assert.match(src, /push\("funnel_stage"/, "funnel_stage is not pushed through push()");
    const stageBlock = src.slice(src.indexOf("function updateStage"), src.indexOf("function buildStageDock"));
    assert.ok(!/dataLayer\.push/.test(stageBlock), "the stage engine writes to dataLayer directly");
  });
});
