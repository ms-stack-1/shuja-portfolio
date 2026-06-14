# Muhammad Shuja: Portfolio and Content Engine

**Live site: [shuja-portfolio-site.pages.dev](https://shuja-portfolio-site.pages.dev)**

A personal site that doubles as a working marketing instrument, paired with a private
content engine that runs the build-in-public side of a job hunt. The portfolio, the
analytics layer, the blog, and the public roadmap are all treated as one marketing entity:
one brand, one measurement model, one publishing loop.

Most portfolios describe skills. This one runs them on the page you are reading.

## What this project is

Three things operated as a single system:

1. **An instrumented portfolio site.** Static, fast, fully crawlable, and wired with a
   GTM-native dataLayer, an on-page tracking console, a client-side audience segmentation
   engine, a live A/B test, UTM capture with on-page personalization, and a consent toggle.
2. **A private content engine.** A local workspace that turns shipped work into LinkedIn
   posts and long-form blog articles through a staged authoring pipeline, with a human
   approval gate before anything is published.
3. **A build-in-public loop.** A public roadmap and audience poll where visitors vote on
   what gets built next, the winner ships, and the reveal links back to the roadmap.

The whole thing is run the way a growth team runs a product: define the funnel, instrument
it, publish against it, read the data, and iterate.

## Repository layout and the public / private split

```
shuja-portfolio/
  site/        # PUBLIC. The deployed website. The only thing that ships.
  engine/      # PRIVATE. Local content workspace and build tooling. Gitignored.
  .gitignore   # keeps engine/ and local tooling config out of version control
  README.md
```

Only `site/` is tracked and deployed. The `engine/` workspace and the local tooling
config are intentionally kept out of version control. That separation is deliberate:

- The public repo stays a clean static site that a recruiter, a crawler, or a hosting
  platform can read end to end with nothing private in it.
- Content strategy, drafts, the backlog, results logs, and connector configuration are
  operating material, not shipping material. They live locally and never reach the remote.
- The build step writes its output into `site/`, so the public repo always contains the
  finished pages, never the machinery that produced them.

If you clone the public repo you get a complete, working website. The engine is the
author's local cockpit, not part of the distributable.

## The site

### Tokens-first design system

The visual system is defined once as CSS custom properties and everything derives from
them. Colors, surfaces, lines, shadows, radii, and the type scale are all tokens on
`:root`, with a full second set scoped to `html[data-theme="dark"]`. Theming is a single
attribute flip on the document element, persisted to `localStorage` and applied before
paint to avoid a flash. There is no CSS framework and no utility-class soup, just a small
token layer and components built on top of it.

- **Type:** Space Grotesk for display, Inter for body, JetBrains Mono for data and code.
- **Theme:** light by default, dark via the token override set, user choice remembered.
- **Aesthetic:** a quiet dashboard look (faint grid background, monospace data, restrained
  accent) that matches the analytics-heavy content.
- **Motion:** reveal-on-scroll and animated counters, all gated by
  `prefers-reduced-motion`.

### Instrumentation and the event schema

All measurement runs through one vanilla JavaScript file that pushes a documented,
GTM-native dataLayer. Every event is mirrored live into an on-page tracking console so a
visitor can watch their own measurement happen, with a plain-English note on how a marketer
would use each signal. The full event schema is published on the site's colophon page.

The dataLayer covers page views, scroll depth, section visibility, time milestones, CTA and
outbound clicks, resume intent, experiment assignment, UTM capture, segment updates,
calculator interaction, consent changes, blog read-completion, and roadmap poll views and
votes. On top of the raw stream sits a small rules engine that scores behavior into an
audience segment in real time and explains, in the console, why the visitor landed in it.

Consent follows the Consent Mode pattern. Until an explicit choice is made, events are
buffered in memory and never reach the dataLayer. On Allow, the consent event is pushed
first so GTM is in a granted state before the buffered queue replays in original order; on
Decline, the buffer is discarded and future pushes are silently dropped. The on-page toggle
and the first-load banner both write the state, and every push respects it.

### Build-in-public surfaces

- **Blog** (`site/blog/`): long-form teardowns and frameworks, each page fully instrumented
  and carrying Person and Article structured data, with a read-completion event that
  separates real readers from headline bouncers.
- **Roadmap** (`site/roadmap.html`): a three-state public board (building, built, planned)
  generated from the same backlog the engine reads, with a poll entry point that ties the
  next build slot to a public vote.

## The content engine (high level)

The engine is a local content operation, not a CMS. It is organized as a set of reusable
rule modules and a few narrow, single-purpose pipeline stages, with the author as the only
publisher.

- **Skills (shared rule sets).** Reusable specifications that every stage reads from: a
  brand-voice guide, a LinkedIn formatting guide, and a blog SEO and structure guide,
  including the frontmatter contract the build step enforces. They keep voice and format
  consistent regardless of which stage is running.
- **LinkedIn pipeline.** Stages that mine shipped work for post angles, draft a single post
  from a chosen angle, run an editorial pass against the voice rules, and atomize an
  approved post into derivatives. Nothing advances without the author picking the angle and
  approving the result.
- **Blog pipeline.** Stages that produce ranked topic briefs, write one long-form draft
  from a chosen brief, and run an on-page SEO and structure edit. The author selects the
  brief and signs off on the final draft.
- **Build step.** A small Node script renders the markdown sources into the static site:
  blog posts and the blog index, the roadmap page from the backlog, and idempotent updates
  to `sitemap.xml` and `llms.txt`. See below.
- **Roadmap loop.** Poll drafting, the "you voted, I shipped" reveal, and backlog state
  sync, with a strict rule that no new poll opens while a won feature is still unshipped.
- **Connectors.** Optional, documented integrations (read-only analytics and a single
  scheduled-posting scenario) that stay dormant until there are real accounts and live
  traffic. No credentials live in the repo, ever.

Every output of the engine is a draft until the author reviews, edits, and approves it.
There is no auto-posting and no auto-publishing.

### The markdown to HTML build

Posts and the roadmap are authored as markdown with frontmatter. A zero-dependency Node
script reads those sources, enforces the required frontmatter fields (and fails loudly if
any are missing), renders a markdown subset, and writes complete, instrumented pages into
`site/` using the exact site scaffold: shared nav and footer, the design system, the
tracking script, structured data, canonical and social tags, and the GTM block. The same
run keeps `sitemap.xml` and `llms.txt` in sync. The generator is the publishing pipeline
and a proof of work at the same time.

## Tech stack

- Hand-written HTML, CSS, and vanilla JavaScript. Zero front-end frameworks, zero runtime
  dependencies, one JavaScript file, one third-party script (Google Tag Manager).
- A zero-dependency Node script (ES modules, Node 18+) for the content build.
- Google Tag Manager and GA4 as the measurement destinations, mapped onto the dataLayer.
- Cloudflare Pages for hosting.

The technology is deliberately boring. A marketing site should load instantly, be fully
crawlable, and put nothing between the visitor and the measurement layer.

## Local development

The site is static and needs no build to view. Serve the `site/` directory with any static
file server and open it in a browser:

```
# from the repo root, any of these works
npx serve site
# or
python -m http.server --directory site 8000
```

Then visit `http://localhost:8000`. The tracking console appears bottom-right; open it to
watch the dataLayer and segmentation update as you browse.

To regenerate content pages from markdown (local authoring workflow, requires the private
engine workspace and Node 18+):

```
node engine/build/build.mjs
```

The build prints what it wrote and what it appended to `sitemap.xml` and `llms.txt`. It is
idempotent: running it twice produces no duplicates.

## Deploy model

Build locally, ship only `site/`.

1. Content is authored and built locally. The build writes finished pages into `site/`.
2. The repo is pushed with `site/` as the only tracked application directory. The engine
   workspace and local tooling config never leave the machine.
3. Cloudflare Pages serves the site with the output directory set to `site/`.
4. Before go-live, the deploy placeholders are set: the GTM container ID, the production
   domain in canonical, Open Graph, sitemap, and structured-data URLs, and the analytics
   destinations mapped onto the documented dataLayer events.

Because the public repo is already the finished static site, deployment is a direct serve
of `site/` with no build step on the hosting side.

## Principles

- **Human in the loop.** The pipeline accelerates production; it does not publish. Every
  post and page is reviewed, edited, and approved by a person before it goes out. Nothing
  posts itself.
- **Authenticity over volume.** Claims are sourced from real, shipped work. Numbers come
  from the proof bank, not from trends, and a draft that needs a metric it does not have is
  flagged rather than filled with a guess.
- **Transparency as the product.** The site shows visitors their own tracking in plain
  language instead of hiding it. The measurement model that runs a client engagement is the
  same one documented on the colophon.
- **Privacy by default.** Pre-consent events are buffered and never flushed until the
  visitor makes an explicit choice; nothing reaches the dataLayer before they decide. On
  decline, the buffer is discarded and subsequent pushes are dropped. No visitor data is
  sold or shared, and no secrets live in the repository.

© 2026 Muhammad Shuja.
