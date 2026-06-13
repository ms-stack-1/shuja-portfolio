/* ============================================================
   Shared helpers for the site test suite: path resolution,
   file discovery, and small HTML/text extractors. Regex-based
   on purpose so the suite stays dependency-free.
   ============================================================ */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative, posix } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SITE = join(ROOT, "site");
export const ASSETS = join(SITE, "assets");

export const DOMAIN = "https://YOURSUBDOMAIN.example.com";
export const GTM_ID = "GTM-XXXXXXX";

export function read(absPath) {
  return readFileSync(absPath, "utf8");
}

export function exists(absPath) {
  return existsSync(absPath);
}

/* Every file under site/ matching an extension, as repo-relative
   POSIX paths (e.g. "site/work/index.html"). */
export function filesUnder(dir, exts) {
  const out = [];
  function walk(d) {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (!exts || exts.some((e) => name.endsWith(e))) out.push(full);
    }
  }
  walk(dir);
  return out;
}

/* HTML pages under site/, returned as objects with absolute path and
   site-relative POSIX path ("index.html", "work/index.html"). */
export function htmlPages() {
  return filesUnder(SITE, [".html"])
    .map((abs) => ({
      abs,
      rel: relative(SITE, abs).split("\\").join("/"),
      get html() {
        return read(abs);
      },
    }))
    .sort((a, b) => a.rel.localeCompare(b.rel));
}

export function readSite(relPosix) {
  return read(join(SITE, relPosix.split("/").join("/")));
}

/* ---------- tiny HTML extractors ---------- */

/* All href="..." and src="..." values in document order. */
export function linkRefs(html) {
  const out = [];
  const re = /(?:href|src)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

export function metaProperty(html, prop) {
  const re = new RegExp(
    `<meta[^>]*property\\s*=\\s*"${escapeRe(prop)}"[^>]*content\\s*=\\s*"([^"]*)"`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

export function metaName(html, name) {
  const re = new RegExp(
    `<meta[^>]*name\\s*=\\s*"${escapeRe(name)}"[^>]*content\\s*=\\s*"([^"]*)"`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

export function titleText(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : null;
}

export function jsonLdBlocks(html) {
  const out = [];
  const re = /<script[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1].trim());
  return out;
}

/* The contents of the first <nav>...</nav> block. */
export function navBlock(html) {
  const m = html.match(/<nav[\s\S]*?<\/nav>/i);
  return m ? m[0] : "";
}

export function footerBlock(html) {
  const m = html.match(/<footer[\s\S]*?<\/footer>/i);
  return m ? m[0] : "";
}

export function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    n++;
    i += needle.length;
  }
  return n;
}

/* Resolve an in-page link to an absolute filesystem path, or null if it
   is external / non-file (http, mailto, tel, #fragment, data:). */
export function resolveLink(pageAbs, ref) {
  if (!ref) return null;
  const trimmed = ref.trim();
  if (
    /^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(trimmed) ||
    trimmed === ""
  ) {
    return null;
  }
  const clean = trimmed.split("#")[0].split("?")[0];
  if (!clean) return null;
  let target;
  if (clean.startsWith("/")) {
    target = join(SITE, clean.slice(1));
  } else {
    target = resolve(dirname(pageAbs), clean);
  }
  return target;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { posix };
