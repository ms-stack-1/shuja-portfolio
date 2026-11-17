# shuja-portfolio

Public portfolio site (`site/`, deployed) plus a private, gitignored content engine (`engine/`).
`engine/SPEC.md` holds the full build spec; this file holds the rules that must survive every session.

## Commands

- `npm test` runs the zero-dependency suite in `tests/`, including `facts.test.mjs`.
- `node engine/build/build.mjs` regenerates the blog pages and `roadmap.html` from `engine/content/`.
  Edit the markdown source, not the generated HTML.
- `python engine/build/og-image.py` regenerates `site/assets/og-card.jpg`.
- `node engine/build/resume-pdf.mjs` regenerates `site/assets/shuja_resume.pdf` from `site/resume.json`.
  Never edit the PDF by hand.

## Boundaries

- This repo never reads or edits sibling folders (fitscore, jd2cv, job-pipeline, career-facts).
- The only cross-repo input is `facts/`, refreshed by "sync facts":
  copy `career-facts/dist/facts.public.json` into `facts/` (never `facts.private.json`),
  run `npm test`, fix the drift it reports, and commit `facts: sync to <version>`.
  That copy is the only time this repo touches career-facts.
- Cross-repo links (for example the FitScore demo) live in one constants file, `links.json` at the
  repo root, created when the first such link is added. Pages and tests take URLs from it; none are hardcoded.

## Career claims

Every money, %, and "Nx" figure on the site, in `resume.json` and in `llms.txt` must be a fact in
`facts/facts.public.json` for the role it describes. `facts/exempt.json` is only for figures that are
not career claims (tracking thresholds, calculator defaults, blog worked examples), each with a reason.
Never exempt a claim to make the test pass; fix the copy or get the fact added in career-facts.

## Deploy

Pushing to `main` auto-deploys on Cloudflare Pages. Only Muhammad pushes, after checking.
Commit locally; do not push.
