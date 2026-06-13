/* Behavioral tests: load the real site/assets/main.js inside the minimal
   DOM stub and exercise its core runtime contracts.

   Covered:
     - boots without throwing and pushes page_view on init
     - default consent is "granted" and the tracking console mounts
     - the consent flag actually gates the dataLayer (denied -> no push)
     - the CAC / ROAS calculator math is correct on real inputs

   main.js is executed via indirect eval so the result is independent of
   CommonJS/ESM resolution under the Electron-as-Node runtime. */
import { describe, it, assert } from "./harness.mjs";
import { installDom } from "./lib/dom-stub.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE } from "./lib/site.mjs";

const MAIN = join(SITE, "assets", "main.js");
const code = readFileSync(MAIN, "utf8");

function buildCalc(mk) {
  const reg = {};
  const ids = [
    "c-budget", "c-cpc", "c-cvr", "c-aov", "c-margin",
    "o-budget", "o-cpc", "o-cvr", "o-aov", "o-margin",
    "r-cac", "r-roas", "r-orders", "r-profit", "r-verdict",
    "calc",
  ];
  for (const id of ids) reg[id] = mk("div");
  for (const id of ["r-cac", "r-roas", "r-orders", "r-profit", "r-verdict"]) {
    reg[id].parentElement = mk("div");
  }
  reg["c-budget"].value = "10000"; // budget $10,000
  reg["c-cpc"].value = "200";      // /100 -> $2.00 CPC
  reg["c-cvr"].value = "50";       // /10  -> 5.0% CVR
  reg["c-aov"].value = "100";      // $100 AOV
  reg["c-margin"].value = "50";    // 50% margin
  return reg;
}

function clickEvent(host) {
  const anchor = {
    hasAttribute: (k) => k === "data-cta",
    getAttribute: () => "unit_test_cta",
    tagName: "A",
    host,
  };
  return { type: "click", target: { closest: () => anchor }, preventDefault() {} };
}

/* ---- one boot, then drive it; capture plain values for the assertions ---- */
const dom = installDom({ dataPage: "home", elements: buildCalc });

let loadError = null;
try {
  // indirect eval runs in global scope; main.js's bare window/document/etc.
  // resolve to the stub globals installed above.
  (0, eval)(code);
} catch (e) {
  loadError = e;
}

const consentDefault = dom.sessionStorage.getItem("ms_consent");
dom.fireDOMContentLoaded();

const dl = dom.window.dataLayer || [];
const hadPageView = dl.some((e) => e && e.event === "page_view");
const bodyIds = dom.bodyChildren().map((c) => c.id);

// Calculator: trigger an input change and read the rendered outputs.
dom.el("c-budget").dispatch("input");
const calc = {
  roas: dom.el("r-roas").textContent,
  cac: dom.el("r-cac").textContent,
  orders: dom.el("r-orders").textContent,
  profit: dom.el("r-profit").textContent,
};
const firedCalcInteraction = dl.some((e) => e && e.event === "calc_interaction");

// Consent gate: denied blocks pushes, granted allows them.
const host = dom.location.host;
const lenBefore = dl.length;
dom.sessionStorage.setItem("ms_consent", "denied");
dom.dispatchDocument("click", clickEvent(host));
const lenAfterDenied = dl.length;
dom.sessionStorage.setItem("ms_consent", "granted");
dom.dispatchDocument("click", clickEvent(host));
const lenAfterGranted = dl.length;
const lastEvent = dl[dl.length - 1];

dom.uninstall();

describe("behavior: boot", () => {
  it("main.js executes without throwing", () => {
    assert.equal(loadError, null, loadError && loadError.stack);
  });
  it("defaults consent to granted on first load", () => {
    assert.equal(consentDefault, "granted");
  });
  it("pushes page_view on DOMContentLoaded", () => {
    assert.ok(hadPageView, "no page_view in dataLayer after init");
  });
  it("mounts the tracking console button and panel", () => {
    assert.ok(bodyIds.includes("tc-btn"), "tracking console button not mounted");
    assert.ok(bodyIds.includes("tc"), "tracking console panel not mounted");
  });
});

describe("behavior: consent gate (the core privacy invariant)", () => {
  it("denied consent blocks dataLayer pushes", () => {
    assert.equal(lenAfterDenied, lenBefore, "a push slipped through while consent was denied");
  });
  it("granted consent allows dataLayer pushes", () => {
    assert.equal(lenAfterGranted, lenBefore + 1, "expected exactly one push when granted");
  });
  it("the allowed event is the cta_click that was clicked", () => {
    assert.ok(lastEvent && lastEvent.event === "cta_click", "last event was not cta_click");
    assert.equal(lastEvent.cta, "unit_test_cta");
  });
});

describe("behavior: CAC / ROAS calculator math", () => {
  // budget 10000, cpc 2.00, cvr 5% -> clicks 5000, orders 250
  // cac 40, revenue 25000, roas 2.5, profit 25000*0.5 - 10000 = 2500
  it("computes ROAS", () => assert.equal(calc.roas, "2.50x"));
  it("computes CAC", () => assert.equal(calc.cac, "$40.00"));
  it("computes orders", () => assert.equal(calc.orders, "250"));
  it("computes profit", () => assert.equal(calc.profit, "$2,500"));
  it("fires calc_interaction on use", () => assert.ok(firedCalcInteraction));
});
