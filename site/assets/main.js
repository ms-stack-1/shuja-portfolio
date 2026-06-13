/* ============================================================
   MUHAMMAD SHUJA · SITE INSTRUMENTATION
   dataLayer-first architecture. Everything below pushes GTM-
   native events; the on-page Tracking Console mirrors the
   stream so visitors can watch their own measurement happen.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 0. dataLayer + consent ---------- */
  window.dataLayer = window.dataLayer || [];
  var PAGE = document.body.getAttribute("data-page") || "unknown";
  var storedChoice = localStorage.getItem("ms_consent_choice");
  var sessionConsent = sessionStorage.getItem("ms_consent");
  var consentState; // "pending" | "granted" | "denied"
  if (sessionConsent !== null) {
    consentState = sessionConsent;                      // honour within-session toggle
  } else if (storedChoice !== null) {
    consentState = storedChoice;                        // returning visitor with durable choice
    sessionStorage.setItem("ms_consent", consentState);
  } else {
    consentState = "pending";                           // first-time visitor: hold the buffer
    sessionStorage.setItem("ms_consent", "pending");
  }
  var T0 = Date.now();
  var pendingQueue = [];                                // pre-consent buffer, capped at 500

  function flushOrBuffer(payload) {
    if (consentState === "granted") {
      window.dataLayer.push(payload);
    } else if (consentState === "pending") {
      if (pendingQueue.length < 500) pendingQueue.push(payload);
    }
    // denied: drop silently
  }

  function setConsentState(state, via) {
    consentState = state;
    localStorage.setItem("ms_consent_choice", state);
    sessionStorage.setItem("ms_consent", state);
    if (state === "granted") {
      // Consent event first so GTM is in granted state before queued events replay
      window.dataLayer.push({ event: "consent_change", state: "granted", via: via || "banner", ts: Date.now() });
      for (var i = 0; i < pendingQueue.length; i++) window.dataLayer.push(pendingQueue[i]);
      pendingQueue = [];
    } else if (state === "denied") {
      pendingQueue = [];
    }
    if (window.__msPaintToggle) window.__msPaintToggle();
  }

  function push(event, detail) {
    var payload = Object.assign({ event: event, page: PAGE, ts: Date.now() }, detail || {});
    logToConsole(event, detail);
    runSegmentation(event, detail);
    flushOrBuffer(payload);
  }

  /* ---------- 1. Tracking console UI ---------- */
  var EXPLAIN = {
    page_view: "Pageview registered. In GTM this fires the Meta Pixel base code + GA4 config tag.",
    scroll_depth: "Scroll-depth trigger. Used to separate skimmers from readers in retargeting audiences.",
    section_view: "Element-visibility trigger. Tells me WHICH proof points you actually read.",
    cta_click: "Click trigger on a conversion element. This is a Meta custom conversion candidate.",
    outbound_click: "Outbound link click. Pipes to GA4 as an engagement signal.",
    resume_intent: "Highest-intent event on this site. Would seed a 1% lookalike audience.",
    time_milestone: "Engaged-time trigger. 60s+ visitors get a different ad sequence than bouncers.",
    experiment_assigned: "You were randomly bucketed into a live A/B test. See the experiment panel on the homepage.",
    utm_captured: "Campaign parameters captured. This is how every visit gets attributed to a source.",
    segment_update: "Rules engine re-scored you based on behavior.",
    calc_interaction: "You used the CAC model. Marked as an analytics-minded visitor.",
    consent_change: "Consent state changed. All tags respect this flag (Consent Mode pattern).",
    theme_change: "UI preference captured. In a real funnel this becomes a personalization dimension.",
    exit_intent: "Exit-intent trigger (cursor left viewport top). Classic last-chance overlay moment.",
    article_read: "Read-completion event: 75% scroll + 30s on a blog post. Separates actual readers from headline bouncers.",
    poll_view: "Roadmap poll seen. Top of the build-in-public loop; the denominator for vote click-through.",
    roadmap_vote_click: "Click-through to the live roadmap poll. The audience co-authoring the build is a conversion event here."
  };

  var logEl, segNameEl, segWhyEl, tcOpen = false;
  function buildConsole() {
    var btn = document.createElement("button");
    btn.id = "tc-btn";
    btn.innerHTML = '<span class="dot"></span> tracking console <span id="tc-count">0</span>';
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "tc");

    var panel = document.createElement("div");
    panel.id = "tc";
    panel.setAttribute("role", "log");
    panel.innerHTML =
      '<header><b>live measurement</b> · dataLayer mirror<span class="spacer"></span>' +
      '<button id="tc-toggle" type="button">tracking: ON</button></header>' +
      '<div class="seg">audience segment → <span class="name" id="tc-seg">Unclassified visitor</span>' +
      '<div class="why" id="tc-why">No behavioral signals yet. Keep browsing; I\'ll re-score you.</div></div>' +
      '<div id="tc-log"></div>' +
      '<footer>Every line here is a real <code>dataLayer.push()</code> in GTM-native format. ' +
      'How it works → <a href="/colophon.html">colophon</a></footer>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);
    logEl = panel.querySelector("#tc-log");
    segNameEl = panel.querySelector("#tc-seg");
    segWhyEl = panel.querySelector("#tc-why");

    btn.addEventListener("click", function () {
      tcOpen = !tcOpen;
      panel.classList.toggle("open", tcOpen);
      btn.setAttribute("aria-expanded", String(tcOpen));
    });

    var tg = panel.querySelector("#tc-toggle");
    window.__msPaintToggle = paintToggle;
    function paintToggle() {
      var off = sessionStorage.getItem("ms_consent") === "denied";
      tg.textContent = off ? "tracking: OFF" : "tracking: ON";
      tg.classList.toggle("off", off);
    }
    paintToggle();
    tg.addEventListener("click", function () {
      var now = consentState === "denied" ? "granted" : "denied";
      // always log to console so the toggle action is visible regardless of state
      logToConsole("consent_change", { state: now, via: "toggle" });
      setConsentState(now, "toggle");
    });
  }

  var count = 0;
  function logToConsole(event, detail) {
    if (!logEl) return;
    count++;
    var c = document.getElementById("tc-count");
    if (c) c.textContent = count;
    var ts = new Date().toTimeString().slice(0, 8);
    var ln = document.createElement("div");
    ln.className = "ln";
    var dt = detail ? Object.keys(detail).map(function (k) { return k + "=" + detail[k]; }).join(" ") : "";
    ln.innerHTML = '<span class="ts">' + ts + '</span><span class="ev">' + event + '</span><span class="dt">' + dt + '</span>';
    ln.title = EXPLAIN[event.replace(/_\d+$/, "")] || EXPLAIN[event] || "";
    logEl.appendChild(ln);
    var why = EXPLAIN[event] || EXPLAIN[event.split("_").slice(0, 2).join("_")];
    if (why) {
      var sub = document.createElement("div");
      sub.className = "ln";
      sub.innerHTML = '<span class="ts">&nbsp;</span><span class="dt" style="color:var(--faint)">↳ ' + why + "</span>";
      logEl.appendChild(sub);
    }
    logEl.scrollTop = logEl.scrollHeight;
  }

  /* ---------- 2. Segmentation rules engine ---------- */
  var S = JSON.parse(sessionStorage.getItem("ms_signals") || "{}");
  S.pages = S.pages || []; S.cases = S.cases || 0; S.depth = S.depth || 0;
  S.contact = S.contact || false; S.resume = S.resume || false; S.calc = S.calc || false;

  function saveS() { sessionStorage.setItem("ms_signals", JSON.stringify(S)); }

  function classify() {
    if (S.resume) return ["Conversion: resume pulled", "You grabbed the resume. In a live funnel you'd now be excluded from prospecting ads and enter a direct-outreach sequence."];
    if (S.contact && S.cases >= 1) return ["Conversion-ready", "Case study + contact page in one session. Retargeting would stop selling and start scheduling: booking-link creative, 7-day window."];
    if (S.calc) return ["Analytics-minded evaluator", "You played with the CAC model. You'd see methodology-led creative: dashboards, attribution breakdowns, not brand fluff."];
    if (S.cases >= 2 || (S.cases >= 1 && S.depth >= 75)) return ["High-intent evaluator", "Multiple proof points read in depth. You'd enter a Meta custom audience and see case-study carousel ads within 48h."];
    if (S.depth >= 50 || S.pages.length >= 2) return ["Engaged browser", "Real reading behavior detected. You'd get one soft-touch retargeting impression, capped, before any spend escalates."];
    return ["Skimmer", "Low engagement so far. Spending retargeting budget on you now would be waste; you'd sit in a 30-day holdout."];
  }

  function runSegmentation(event, detail) {
    var changed = false;
    if (event === "page_view") {
      if (S.pages.indexOf(PAGE) === -1) { S.pages.push(PAGE); changed = true; }
      if (/^case_/.test(PAGE) && S["seen_" + PAGE] !== 1) { S["seen_" + PAGE] = 1; S.cases++; changed = true; }
      if (PAGE === "contact" && !S.contact) { S.contact = true; changed = true; }
    }
    if (event === "scroll_depth" && detail && detail.percent > S.depth) { S.depth = detail.percent; changed = true; }
    if (event === "resume_intent" && !S.resume) { S.resume = true; changed = true; }
    if (event === "calc_interaction" && !S.calc) { S.calc = true; changed = true; }
    if (!changed) return;
    saveS();
    var seg = classify();
    if (segNameEl && segNameEl.textContent !== seg[0]) {
      segNameEl.textContent = seg[0];
      segWhyEl.textContent = seg[1];
      logToConsole("segment_update", { segment: seg[0] });
      flushOrBuffer({ event: "segment_update", segment: seg[0], page: PAGE, ts: Date.now() });
    } else if (segNameEl) {
      segNameEl.textContent = seg[0]; segWhyEl.textContent = seg[1];
    }
  }

  /* ---------- 3. A/B experiment: hero headline ---------- */
  function runExperiment() {
    var hero = document.getElementById("hero-headline");
    if (!hero) return;
    var v = localStorage.getItem("ms_exp_hero");
    if (!v) { v = Math.random() < 0.5 ? "control" : "variant_b"; localStorage.setItem("ms_exp_hero", v); }
    var COPY = {
      control: 'Marketing that <span class="hl">proves its own math.</span>',
      variant_b: 'I turn ad spend into <span class="hl">revenue systems.</span>'
    };
    hero.innerHTML = COPY[v];
    var tag = document.getElementById("exp-variant");
    if (tag) tag.textContent = v === "control" ? "A · control" : "B · challenger";
    push("experiment_assigned", { experiment: "hero_headline_v1", variant: v });
  }

  /* ---------- 4. UTM capture + personalization ---------- */
  function handleUTM() {
    var p = new URLSearchParams(location.search);
    var src = p.get("utm_source"), med = p.get("utm_medium"), cmp = p.get("utm_campaign");
    if (src) {
      sessionStorage.setItem("ms_utm", JSON.stringify({ source: src, medium: med, campaign: cmp }));
      push("utm_captured", { source: src, medium: med || "n/a", campaign: cmp || "n/a" });
    }
    var stored = JSON.parse(sessionStorage.getItem("ms_utm") || "null");
    var chip = document.getElementById("utm-chip");
    if (chip && stored) {
      var nice = { linkedin: "LinkedIn", twitter: "X", x: "X", email: "email", github: "GitHub", google: "Google" }[String(stored.source).toLowerCase()] || stored.source;
      chip.style.display = "inline-flex";
      chip.textContent = "Visiting from " + nice + ", attributed via UTM. The 90-second version: scroll once, read the tiles.";
    }
  }

  /* ---------- 5. Standard event wiring ---------- */
  function wireEvents() {
    push("page_view", { path: location.pathname });

    // scroll depth
    var marks = [25, 50, 75, 100], fired = {};
    window.addEventListener("scroll", function () {
      var h = document.documentElement;
      var pct = Math.round((h.scrollTop + window.innerHeight) / h.scrollHeight * 100);
      marks.forEach(function (m) {
        if (pct >= m && !fired[m]) { fired[m] = 1; push("scroll_depth", { percent: m }); }
      });
    }, { passive: true });

    // time milestones
    [30, 60, 120].forEach(function (s) {
      setTimeout(function () { push("time_milestone", { seconds: s }); }, s * 1000);
    });

    // section views
    if ("IntersectionObserver" in window) {
      var seen = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !seen[e.target.id]) {
            seen[e.target.id] = 1;
            push("section_view", { section: e.target.id });
            var v = e.target.querySelector("[data-vote]");
            if (v) push("poll_view", { poll: v.getAttribute("data-vote") });
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.4 });
      document.querySelectorAll("[data-track-section]").forEach(function (el) { io.observe(el); });
    }

    // clicks
    document.addEventListener("click", function (ev) {
      var a = ev.target.closest("a,button");
      if (!a) return;
      if (a.hasAttribute("data-cta")) push("cta_click", { cta: a.getAttribute("data-cta") });
      if (a.hasAttribute("data-vote")) push("roadmap_vote_click", { poll: a.getAttribute("data-vote") });
      if (a.hasAttribute("data-resume")) push("resume_intent", { format: a.getAttribute("data-resume") });
      if (a.tagName === "A" && a.host && a.host !== location.host) push("outbound_click", { to: a.host });
    });
  }

  /* ---------- 6. Reveals + counters + hbar fills ---------- */
  function wireVisuals() {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ("IntersectionObserver" in window && !reduced) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          e.target.querySelectorAll(".fill[data-w]").forEach(function (f) { f.style.width = f.getAttribute("data-w") + "%"; });
          e.target.querySelectorAll("[data-count]").forEach(animateCount);
          io.unobserve(e.target);
        });
      }, { threshold: 0.25 });
      document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll(".rv").forEach(function (el) {
        el.classList.add("in");
        el.querySelectorAll(".fill[data-w]").forEach(function (f) { f.style.width = f.getAttribute("data-w") + "%"; });
        el.querySelectorAll("[data-count]").forEach(function (el2) { el2.textContent = el2.getAttribute("data-count"); });
      });
    }
  }
  function animateCount(el) {
    var raw = el.getAttribute("data-count");
    var num = parseFloat(raw.replace(/[^0-9.]/g, ""));
    var prefix = raw.match(/^[^0-9.]*/)[0], suffix = raw.match(/[^0-9.]*$/)[0];
    var dec = (raw.split(".")[1] || "").replace(/[^0-9]/g, "").length;
    var t0 = null, dur = 1300;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      p = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (num * p).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- 7. CAC / ROAS calculator ---------- */
  function wireCalc() {
    var c = document.getElementById("calc");
    if (!c) return;
    var $ = function (id) { return document.getElementById(id); };
    var inputs = ["c-budget", "c-cpc", "c-cvr", "c-aov", "c-margin"].map($);
    var touched = false;
    function fmt(n, d) { return n.toLocaleString("en-US", { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
    function recalc() {
      var budget = +$("c-budget").value, cpc = +$("c-cpc").value / 100,
          cvr = +$("c-cvr").value / 10, aov = +$("c-aov").value, margin = +$("c-margin").value;
      $("o-budget").value = "$" + fmt(budget);
      $("o-cpc").value = "$" + fmt(cpc, 2);
      $("o-cvr").value = cvr.toFixed(1) + "%";
      $("o-aov").value = "$" + fmt(aov);
      $("o-margin").value = margin + "%";
      var clicks = budget / cpc, orders = clicks * cvr / 100;
      var cac = orders ? budget / orders : 0;
      var revenue = orders * aov, roas = budget ? revenue / budget : 0;
      var profit = revenue * margin / 100 - budget;
      $("r-cac").textContent = "$" + fmt(cac, 2);
      $("r-roas").textContent = roas.toFixed(2) + "x";
      $("r-orders").textContent = fmt(Math.round(orders));
      $("r-profit").textContent = (profit < 0 ? "−$" : "$") + fmt(Math.abs(profit));
      var pr = $("r-profit").parentElement, rr = $("r-roas").parentElement;
      pr.classList.toggle("good", profit >= 0); pr.classList.toggle("bad", profit < 0);
      var breakeven = margin ? (100 / margin) : 0;
      rr.classList.toggle("good", roas >= breakeven); rr.classList.toggle("bad", roas < breakeven);
      $("r-verdict").textContent = roas >= breakeven
        ? "Above breakeven ROAS of " + breakeven.toFixed(2) + "x at this margin. Scale spend until marginal CAC erodes the gap, then rebalance toward retention."
        : "Below the " + breakeven.toFixed(2) + "x breakeven this margin demands. Fix CVR or AOV before adding budget; more spend just buys losses faster.";
      if (!touched) { touched = true; }
      else if (touched !== "done") { push("calc_interaction", { roas: roas.toFixed(2) }); touched = "done"; }
    }
    inputs.forEach(function (i) { i.addEventListener("input", recalc); });
    recalc();
  }

  /* ---------- 7b. Blog read-completion ---------- */
  function wireArticle() {
    if (PAGE.indexOf("blog_") !== 0 || PAGE === "blog_index") return;
    if (!document.querySelector("[data-article]")) return;
    var timeOk = false, scrollOk = false, fired = false;
    function check() {
      if (fired || !timeOk || !scrollOk) return;
      fired = true;
      push("article_read", { slug: PAGE.slice(5), seconds: Math.round((Date.now() - T0) / 1000) });
    }
    setTimeout(function () { timeOk = true; check(); }, 30000);
    window.addEventListener("scroll", function () {
      if (scrollOk) return;
      var h = document.documentElement;
      if (Math.round((h.scrollTop + window.innerHeight) / h.scrollHeight * 100) >= 75) { scrollOk = true; check(); }
    }, { passive: true });
  }

  /* ---------- 8. Nav ---------- */
  function wireNav() {
    var t = document.querySelector(".nav-toggle");
    var l = document.querySelector(".nav-links");
    if (t && l) t.addEventListener("click", function () { l.classList.toggle("open"); });
  }


  /* ---------- 9. Theme switcher ---------- */
  function wireTheme() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    function paint() {
      var t = document.documentElement.getAttribute("data-theme") || "light";
      btn.innerHTML = t === "light" ? "&#9789; dark" : "&#9788; light";
      btn.setAttribute("aria-label", "Switch to " + (t === "light" ? "dark" : "light") + " theme");
    }
    paint();
    btn.addEventListener("click", function () {
      var next = (document.documentElement.getAttribute("data-theme") || "light") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("ms_theme", next);
      paint();
      push("theme_change", { theme: next });
    });
  }

  /* ---------- 10. Consent banner (first load) ---------- */
  function wireConsent() {
    if (localStorage.getItem("ms_consent_choice")) return;
    var el = document.createElement("div");
    el.id = "consent";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Tracking consent");
    el.innerHTML =
      '<div class="ttl">This site practices what it preaches.</div>' +
      '<p>It measures scroll depth, section views and clicks, then shows you every event in an on-page console and ' +
      'explains how a marketer would use it. No third-party data sale, ever. Full schema in the <a href="' +
      (PAGE.indexOf("case_") === 0 || PAGE === "work" ? "../" : "") + 'colophon.html">colophon</a>.</p>' +
      '<div class="row"><button class="btn" id="cs-yes">Allow tracking</button>' +
      '<button class="btn ghost" id="cs-no">Decline</button></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    function choose(state) {
      el.classList.remove("show");
      logToConsole("consent_change", { state: state, via: "banner" });
      setConsentState(state, "banner");
    }
    el.querySelector("#cs-yes").addEventListener("click", function () { choose("granted"); });
    el.querySelector("#cs-no").addEventListener("click", function () { choose("denied"); });
  }

  /* ---------- 11. Exit-intent popup ---------- */
  function wireExit() {
    if (sessionStorage.getItem("ms_exit_shown")) return;
    function show() {
      if (sessionStorage.getItem("ms_exit_shown")) return;
      sessionStorage.setItem("ms_exit_shown", "1");
      var denied = sessionStorage.getItem("ms_consent") === "denied";
      var seg = classify();
      var secs = Math.round((Date.now() - T0) / 1000);
      var v = localStorage.getItem("ms_exp_hero") || "control";
      var root = (PAGE.indexOf("case_") === 0 || PAGE === "work") ? "../" : "";
      var receipt = denied
        ? '<div class="receipt">tracking: <b>declined</b>, so this is a blind farewell.<br>Respecting that is also part of the job.</div>'
        : '<div class="receipt">session receipt · what retargeting would know:<br>' +
          'pages_viewed: <b>' + S.pages.length + '</b> &nbsp; case_studies: <b>' + S.cases + '</b> &nbsp; max_scroll: <b>' + S.depth + '%</b><br>' +
          'time_on_site: <b>' + secs + 's</b> &nbsp; hero_variant: <b>' + v + '</b><br>' +
          'segment: <b>' + seg[0] + '</b></div>';
      var el = document.createElement("div");
      el.id = "exitm";
      el.setAttribute("role", "dialog");
      el.innerHTML =
        '<div class="box"><button class="x" aria-label="Close">&times;</button>' +
        '<h3>Leaving? Your session says you almost didn\u2019t.</h3>' + receipt +
        '<p>In a live funnel, this moment triggers the win-back sequence. Here, it can just be an email instead.</p>' +
        '<div class="row"><a class="btn" href="mailto:mshujasiddiq@gmail.com" data-cta="exit_email">Email Muhammad &rarr;</a>' +
        '<a class="btn ghost" href="' + root + 'work/index.html" data-cta="exit_work">One more case study</a></div></div>';
      document.body.appendChild(el);
      requestAnimationFrame(function () { el.classList.add("show"); });
      push("exit_intent", { segment: seg[0], seconds: secs });
      function close() { el.classList.remove("show"); setTimeout(function(){ el.remove(); }, 200); }
      el.querySelector(".x").addEventListener("click", close);
      el.addEventListener("click", function (e) { if (e.target === el) close(); });
      document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
    }
    document.addEventListener("mouseout", function (e) {
      if (!e.relatedTarget && e.clientY <= 8) show();
    });
  }

  /* ---------- 12. Tools wall ignition ---------- */
  function wireTools() {
    var grid = document.querySelector(".tools-grid");
    if (!grid) return;
    var tools = grid.querySelectorAll(".tool");
    tools.forEach(function (t) {
      t.addEventListener("click", function () { t.classList.toggle("lit"); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t.classList.toggle("lit"); }
      });
    });
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    buildConsole();
    wireNav();
    wireTheme();
    wireConsent();
    wireExit();
    wireTools();
    runExperiment();
    handleUTM();
    wireEvents();
    wireVisuals();
    wireCalc();
    wireArticle();
  });
})();
