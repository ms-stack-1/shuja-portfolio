/* Career facts: every public claim agrees with the pinned facts.

   facts/facts.public.json is a copy of career-facts' public export, refreshed
   by "sync facts". It is the only cross-repo input; this test never reads a
   sibling folder. facts/exempt.json lists the few figures on the site that are
   not career claims (calculator defaults, blog worked examples), each with a
   reason and a context string that pins it to one passage.

   Surfaces checked: site/**\/*.html, site/resume.json, site/llms.txt.

   A "passage" is where requires_context looks for its string:
     HTML       the nearest enclosing p, li, tr, h1-h6, title, blockquote,
                figcaption, dt, dd, caption, summary, button or label; if none,
                the nearest section, header, footer, article, aside, nav, main
                or body. Each meta content / alt / aria-label / title attribute
                and each JSON-LD string is a passage of its own.
     llms.txt   one line.
     resume     one string value.

   A figure's role: headline metrics may appear anywhere; any other figure must
   belong to the role (and client, if the passage names one) that the passage
   is about. That is the role it names, else its case-study page or resume.json
   work entry or llms.txt Experience line. A passage about no single role
   (the homepage ticker) may use any fact figure.

   Title fields (for applies_to: "titles"): JSON-LD jobTitle, the about.html
   timeline headings, the case-study "role" line, resume.json basics.label and
   work[].position, and llms.txt's Title line and Experience lines. */
import { describe, it, assert } from "./harness.mjs";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, SITE, htmlPages, read } from "./lib/site.mjs";

const FACTS = JSON.parse(read(join(ROOT, "facts", "facts.public.json")));
const EXEMPT_PATH = join(ROOT, "facts", "exempt.json");
const EXEMPT = existsSync(EXEMPT_PATH) ? JSON.parse(read(EXEMPT_PATH)) : [];

/* ---------- figures ---------- */

const FIGURE_RE = new RegExp(
  [
    String.raw`(?:US)?\$\s?\d[\d,]*(?:\.\d+)?(?:\s?[KMB]\b)?`, // money
    String.raw`USD\s?\d[\d,]*(?:\.\d+)?(?:\s?[KMB]\b)?`, // money, spelled out
    String.raw`\d+(?:\.\d+)?(?:\s?[-–]\s?\d+(?:\.\d+)?)?\s?%`, // percent or range
    String.raw`\b\d+(?:\.\d+)?x\b`, // multiple
  ].join("|"),
  "gi"
);

/* Canonical form, so "$272K" == "$272,000" and "60 - 65%" == "60-65%". */
function normFigure(raw) {
  const s = raw.replace(/\s+/g, "");
  const money = s.match(/^(?:US\$|\$|USD)([\d,]+(?:\.\d+)?)([KMB])?$/i);
  if (money) {
    const mult = { K: 1e3, M: 1e6, B: 1e9 }[(money[2] || "").toUpperCase()] || 1;
    return "$" + Math.round(parseFloat(money[1].replace(/,/g, "")) * mult);
  }
  if (s.endsWith("%")) return s.replace("–", "-");
  if (/x$/i.test(s)) return parseFloat(s) + "x";
  return s;
}

function figuresIn(text) {
  return [...text.matchAll(FIGURE_RE)].map((m) => ({ raw: m[0].trim(), norm: normFigure(m[0]) }));
}

/* Headline metrics may appear anywhere. Every other figure belongs to the
   role (and client scope, if any) of the fact that carries it, so "42%" is
   Food Crowd revenue and cannot stand in for a PrimaCare open rate. */
const HEADLINE = new Set();
for (const m of FACTS.headline_metrics) for (const fig of m.figures) figuresIn(fig).forEach((x) => HEADLINE.add(x.norm));

const OWNERS = new Map(); // norm -> [{ role, scope }]
for (const r of FACTS.roles)
  for (const f of r.facts || [])
    for (const fig of f.figures || [])
      for (const x of figuresIn(fig)) {
        if (!OWNERS.has(x.norm)) OWNERS.set(x.norm, []);
        OWNERS.get(x.norm).push({ role: r.id, scope: f.scope || null });
      }

/* ---------- roles ---------- */

/* Names a passage can use to point at a role: the employer's short name
   ("PrimaCare", "Al Aaraf") or a client scoped under it ("Food Crowd"). */
const NAMES = FACTS.roles.flatMap((r) => {
  const words = r.employer.split(/\s+/);
  const short = words[0].length <= 3 ? words.slice(0, 2).join(" ") : words[0];
  const clients = [...new Set((r.facts || []).map((f) => f.scope).filter(Boolean))];
  return [{ label: short, role: r.id, scope: null }, ...clients.map((c) => ({ label: c, role: r.id, scope: c }))];
});

/* The role and client a passage speaks about: what it names, when it names
   exactly one role; otherwise the page's or entry's own role. */
function attribution(u) {
  const ctx = u.context.toLowerCase();
  const named = NAMES.filter((n) => ctx.includes(n.label.toLowerCase()));
  const roles = [...new Set(named.map((n) => n.role))];
  if (roles.length !== 1) return { role: u.role, scope: u.scope || null };
  const clients = named.filter((n) => n.scope);
  return { role: roles[0], scope: clients.length === 1 ? clients[0].scope : roles[0] === u.role ? u.scope || null : null };
}

function figureFits(norm, { role, scope }) {
  if (HEADLINE.has(norm)) return true;
  const owners = OWNERS.get(norm);
  if (!owners) return false;
  if (!role) return true;
  return owners.some((o) => o.role === role && (!scope || !o.scope || o.scope === scope));
}

function ownerLabel(norm) {
  const owners = OWNERS.get(norm);
  if (!owners) return "not in facts";
  return "fact belongs to " + [...new Set(owners.map((o) => o.scope || o.role))].join(", ");
}

function roleForEmployer(name) {
  const n = name.replace(/\(.*?\)/g, "").trim().toLowerCase();
  if (!n) return null;
  const r = FACTS.roles.find((r) => {
    const e = r.employer.toLowerCase();
    return e.startsWith(n) || n.startsWith(e);
  });
  return r ? r.id : null;
}

/* A case-study slug is a role id, or a client scoped under one ("food-crowd"). */
function pageOwner(slug) {
  const words = slug.replace(/-/g, " ");
  for (const r of FACTS.roles) {
    if (r.id === slug) return { role: r.id, scope: null };
    const f = (r.facts || []).find((f) => f.scope && f.scope.toLowerCase() === words);
    if (f) return { role: r.id, scope: f.scope };
  }
  return { role: null, scope: null };
}

/* ---------- units: { file, text, context, title, role, scope } ----------
   text     what patterns and figures are matched against
   context  the full passage, for requires_context
   title    true for title fields */

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·",
  mdash: "—", ndash: "–", rarr: "→", larr: "←", times: "×", minus: "−", hellip: "…", copy: "©",
};
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}
const squash = (s) => s.replace(/\s+/g, " ").trim();

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const PASSAGE = new Set(["p", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "title", "blockquote", "figcaption", "dt", "dd", "caption", "summary", "button", "label"]);
const FALLBACK = new Set(["section", "header", "footer", "article", "aside", "nav", "main", "body", "html"]);
const INLINE = new Set(["a", "b", "i", "em", "strong", "span", "small", "sup", "sub", "code", "abbr", "mark", "u", "s", "time", "kbd", "q"]);
const TEXT_ATTRS = ["content", "alt", "aria-label", "title"];

function attr(attrs, name) {
  const m = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? decode(m[1]) : null;
}

function jsonStrings(node, path, out) {
  if (typeof node === "string") out.push({ path, value: node });
  else if (Array.isArray(node)) node.forEach((v, i) => jsonStrings(v, `${path}[${i}]`, out));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) jsonStrings(v, path ? `${path}.${k}` : k, out);
  return out;
}

function htmlUnits(file, html, page) {
  const units = [];
  const nodes = []; // text nodes: { text, owner }
  const owners = []; // passage elements: { tag, first, last }
  const stack = [{ tag: "#root", owner: null }];
  // Animated counters ship "0" and count up to data-count; the claim is the target.
  const src = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(<[^>]*\sdata-count="([^"]*)"[^>]*>)[^<]*/g, "$1$2");
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src))) {
    const [, close, rawTag, attrs, selfClose, text] = m;
    if (text !== undefined) {
      const top = stack[stack.length - 1];
      if (top.owner) {
        nodes.push({ text: decode(text), owner: top.owner });
        top.owner.last = nodes.length;
      }
      continue;
    }
    const tag = rawTag.toLowerCase();
    // Block boundaries separate words; inline tags join ("$" <span>850</span> "K").
    if (!INLINE.has(tag)) {
      const top = stack[stack.length - 1];
      if (top.owner) nodes.push({ text: " ", owner: top.owner });
    }
    if (close) {
      const i = stack.map((e) => e.tag).lastIndexOf(tag);
      if (i > 0) stack.length = i;
      continue;
    }
    // raw-text elements: JSON-LD is claims, the rest is code or drawing
    if (tag === "script" || tag === "style" || tag === "svg") {
      const end = src.indexOf(`</${tag}`, re.lastIndex);
      const body = src.slice(re.lastIndex, end < 0 ? src.length : end);
      re.lastIndex = end < 0 ? src.length : src.indexOf(">", end) + 1;
      if (tag === "script" && /application\/ld\+json/i.test(attrs)) {
        for (const { path, value } of jsonStrings(JSON.parse(body), "", [])) {
          const isTitle = /(^|\.)jobTitle$/.test(path);
          units.push({ file, where: `JSON-LD ${path}`, text: value, context: value, title: isTitle, role: isTitle ? null : page.role, scope: page.scope });
        }
      }
      continue;
    }
    for (const a of TEXT_ATTRS) {
      const v = attr(attrs, a);
      if (v && /\S/.test(v)) units.push({ file, where: `<${tag} ${a}>`, text: v, context: v, title: false, role: page.role, scope: page.scope });
    }
    if (VOID.has(tag) || selfClose) continue;
    const parentOwner = stack[stack.length - 1].owner;
    let owner = parentOwner;
    if (PASSAGE.has(tag) || (FALLBACK.has(tag) && !(parentOwner && PASSAGE.has(parentOwner.tag)))) {
      owner = { tag, first: nodes.length, last: nodes.length, parent: parentOwner };
      owners.push(owner);
    }
    stack.push({ tag, owner });
  }

  // Each owner's context is all text inside it; its own text is the text not
  // claimed by a nested owner, so every text node is scanned exactly once.
  for (const o of owners) {
    const own = squash(nodes.filter((n) => n.owner === o).map((n) => n.text).join(""));
    if (!own) continue;
    const context = squash(nodes.slice(o.first, o.last).map((n) => n.text).join(""));
    units.push({ file, where: `<${o.tag}>`, text: own, context, title: false, role: page.role, scope: page.scope });
  }

  // Title fields in the page body.
  for (const tm of src.matchAll(/<div class="tl-item">[\s\S]*?<h3>([\s\S]*?)<\/h3>/g)) {
    const [title, employer = ""] = squash(decode(tm[1].replace(/<[^>]+>/g, ""))).split(" · ");
    units.push({ file, where: "timeline heading", text: title, context: title, title: true, role: roleForEmployer(employer) });
  }
  for (const rm of src.matchAll(/<span>role <b>([\s\S]*?)<\/b><\/span>/g)) {
    const title = squash(decode(rm[1]));
    units.push({ file, where: "case-study role", text: title, context: title, title: true, role: page.role });
  }
  return units;
}

function resumeUnits(resume) {
  const file = "site/resume.json";
  const units = [];
  for (const { path, value } of jsonStrings(resume, "", [])) {
    const w = path.match(/^work\[(\d+)\]/);
    const role = w ? roleForEmployer(resume.work[+w[1]].name) : null;
    const title = path === "basics.label" || /^work\[\d+\]\.position$/.test(path);
    units.push({ file, where: path, text: value, context: value, title, role });
  }
  return units;
}

function llmsUnits(txt) {
  const file = "site/llms.txt";
  const units = [];
  let section = "";
  txt.split(/\r?\n/).forEach((line, i) => {
    if (line.startsWith("## ")) section = line.slice(3).trim();
    if (!line.trim()) return;
    let role = null;
    const exp = section === "Experience" && line.match(/^- [^:]+:\s*(.+?),\s*([^,.(]+)/);
    if (exp) {
      role = roleForEmployer(exp[2]);
      units.push({ file, where: `line ${i + 1} (title)`, text: exp[1], context: line, title: true, role });
    }
    const t = line.match(/^- Title:\s*(.+)$/);
    if (t) units.push({ file, where: `line ${i + 1} (title)`, text: t[1], context: line, title: true, role: null });
    units.push({ file, where: `line ${i + 1}`, text: line, context: line, title: false, role });
  });
  return units;
}

const RESUME = JSON.parse(read(join(SITE, "resume.json")));
const UNITS = [
  ...htmlPages().flatMap((p) => {
    const slug = p.rel.match(/^work\/([\w-]+)\.html$/);
    return htmlUnits(`site/${p.rel}`, p.html, pageOwner(slug ? slug[1] : ""));
  }),
  ...resumeUnits(RESUME),
  ...llmsUnits(read(join(SITE, "llms.txt"))),
];

/* ---------- rules ---------- */

function rulesOf(list, kind) {
  return list
    .filter((r) => (r.applies_to || "all") !== "cv")
    .map((r) => {
      const scope = r.applies_to || "all";
      if (scope !== "all" && scope !== "titles") throw new Error(`${kind} ${r.id}: unknown applies_to "${scope}"`);
      return { ...r, kind, scope, res: r.patterns.map((p) => new RegExp(p, (r.flags || "").replace("g", "") + "g")) };
    });
}
const RULES = [...rulesOf(FACTS.banned, "banned"), ...rulesOf(FACTS.not_stated, "not_stated")];

function ruleCovers(rule, unit) {
  if (rule.scope === "titles" && !unit.title) return false;
  if (rule.role && unit.role !== rule.role) return false;
  return true;
}

/* ---------- reporting ---------- */

function grouped(hits) {
  const byFile = new Map();
  for (const h of hits) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file).push(h.line);
  }
  return [...byFile].map(([f, lines]) => `${f}\n` + [...new Set(lines)].map((l) => `  - ${l}`).join("\n")).join("\n");
}
const clip = (s, n = 110) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function isExempt(unit, figure) {
  return EXEMPT.find(
    (e) => e.file === unit.file && normFigure(e.figure) === figure.norm && unit.context.includes(e.context)
  );
}
const usedExemptions = new Set();

/* ---------- tests ---------- */

describe("facts: pinned copy", () => {
  it("facts/facts.public.json is a versioned public export", () => {
    assert.equal(FACTS.audience, "public");
    assert.match(FACTS.version, /^\d{4}\.\d{1,2}\.\d+$/);
  });

  it("the pinned copy carries no private-only fields", () => {
    for (const r of FACTS.roles) assert.equal(r.official_title, undefined, `${r.id} has official_title`);
  });
});

describe("facts: claims on the site agree with the facts", () => {
  it("every money, % and Nx figure is a fact figure of the role it describes, or exempt", () => {
    const hits = [];
    for (const u of UNITS) {
      if (u.title) continue; // title units duplicate text already scanned
      const who = attribution(u);
      for (const f of figuresIn(u.text)) {
        if (figureFits(f.norm, who)) continue;
        const ex = isExempt(u, f);
        if (ex) {
          usedExemptions.add(ex);
          continue;
        }
        const about = who.scope || who.role;
        const why = OWNERS.has(f.norm) ? `${ownerLabel(f.norm)}, passage is about ${about}` : "not in facts";
        hits.push({ file: u.file, line: `${f.raw} (${why})  [${u.where}] ${clip(u.context)}` });
      }
    }
    assert.ok(hits.length === 0, `${hits.length} unknown figure(s):\n${grouped(hits)}`);
  });

  it("no banned or not_stated pattern appears", () => {
    const hits = [];
    for (const rule of RULES) {
      for (const u of UNITS) {
        if (!ruleCovers(rule, u)) continue;
        if (rule.scope === "all" && u.title) continue; // scanned as ordinary text
        for (const re of rule.res) {
          for (const m of u.text.matchAll(re)) {
            if (rule.requires_context && u.context.toLowerCase().includes(rule.requires_context.toLowerCase())) continue;
            hits.push({ file: u.file, line: `${rule.id}: "${m[0]}"  [${u.where}] ${clip(u.context)}` });
          }
        }
      }
    }
    assert.ok(hits.length === 0, `${hits.length} banned match(es):\n${grouped(hits)}`);
  });

  it(`the years claim reads "${FACTS.experience.years_claim}" and no other tenure is stated`, () => {
    assert.equal(FACTS.experience.years_claim, "5 years");
    const claim = FACTS.experience.years_claim;
    const hits = [];
    if (!RESUME.basics.summary.includes(claim)) hits.push({ file: "site/resume.json", line: `basics.summary lacks "${claim}"` });
    if (!read(join(SITE, "llms.txt")).includes(claim)) hits.push({ file: "site/llms.txt", line: `no "${claim}"` });
    const N = "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve";
    const YEARS = new RegExp(`\\b(${N})\\s*\\+?\\s*(years|yrs)\\b`, "gi");
    for (const u of UNITS) {
      if (u.title) continue;
      for (const m of u.text.matchAll(YEARS)) {
        if (m[0].toLowerCase().replace(/\s+/g, " ") === claim) continue;
        if (isExempt(u, { norm: normFigure(m[0]) })) continue;
        hits.push({ file: u.file, line: `"${m[0]}"  [${u.where}] ${clip(u.context)}` });
      }
    }
    assert.ok(hits.length === 0, `${hits.length} tenure mismatch(es):\n${grouped(hits)}`);
  });

  it("resume.json titles and dates equal the facts", () => {
    const problems = [];
    const seen = new Set();
    for (const w of RESUME.work) {
      const id = roleForEmployer(w.name);
      const role = FACTS.roles.find((r) => r.id === id);
      if (!role) {
        problems.push(`work "${w.name}" matches no role in the facts`);
        continue;
      }
      seen.add(id);
      if (w.position !== role.title) problems.push(`${id}: position "${w.position}" ≠ "${role.title}"`);
      if (w.startDate !== role.start) problems.push(`${id}: startDate ${w.startDate} ≠ ${role.start}`);
      const end = role.end === "present" ? undefined : role.end;
      if (w.endDate !== end) problems.push(`${id}: endDate ${w.endDate ?? "(none)"} ≠ ${end ?? "(none, present)"}`);
    }
    for (const r of FACTS.roles) if (!seen.has(r.id)) problems.push(`${r.id}: missing from resume.json work[]`);
    assert.ok(problems.length === 0, `${problems.length} mismatch(es):\n` + problems.map((p) => `  - ${p}`).join("\n"));
  });
});

describe("facts: exemptions", () => {
  it("every exemption names a file, figure, context and reason", () => {
    assert.ok(Array.isArray(EXEMPT), "facts/exempt.json must be an array");
    for (const e of EXEMPT) {
      for (const k of ["file", "figure", "context", "reason"])
        assert.ok(typeof e[k] === "string" && e[k].trim(), `exemption missing ${k}: ${JSON.stringify(e)}`);
    }
  });

  it("every figure exemption is still needed", () => {
    const stale = EXEMPT.filter((e) => !/years?$/i.test(e.figure) && !usedExemptions.has(e));
    assert.ok(stale.length === 0, "unused exemption(s):\n" + stale.map((e) => `  - ${e.file} ${e.figure} (${e.context})`).join("\n"));
  });
});
