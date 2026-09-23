# Product

## Register

brand

The site IS the portfolio. Design carries the argument; there is no app behind it.

## Users

**Primary: marketing hiring managers and agency leads** evaluating Muhammad Shuja for
performance marketing / growth analyst roles. Semi-technical: fluent in funnel, ROAS,
CAC and attribution language, not necessarily in code. Context of use is a fast
evaluation pass, often mid-shortlist, frequently on mobile, sometimes from a LinkedIn
profile link.

Secondary: recruiters and ATS screeners doing a 40-second skim, and technical growth-eng
hybrids who will open devtools and read the dataLayer.

The job to be done: decide, quickly and with evidence, whether this person can run paid
media and prove what it returned.

## Product Purpose

Convert a visitor into a conversation. The site's whole argument is that marketing claims
should carry their own proof, so the site instruments itself and shows the reader the
measurement as it happens.

Success = the visitor reaches the contact surface believing the numbers.

## Brand Personality

Instrumented, kinetic, accountable.

Voice is an operator's, not a salesperson's: states a number, names the engagement it
came from, moves on. Confident without inflation. The site should feel like a live
readout of something actually moving, not a brochure about past work.

Emotional goal: a hiring manager thinks "this person measures things, and I can see them
doing it right now."

## The concept: the visitor IS the lead

The organizing idea. The site already classifies visitors and tracks scroll depth, so it
already knows where a reader sits in a funnel. The design surfaces that honestly rather
than decoratively: a persistent stage tracker narrates the visitor's own progression
through Awareness -> Interest -> Consideration -> Intent -> Conversion, driven by real
engagement signals and persisting across pages.

The metaphor must stay truthful. Every stage reading reflects a real measured signal. A
fabricated or purely decorative funnel would contradict the site's entire argument.

## Anti-references

- SaaS landing-page template: hero metric row, identical icon cards, gradient accents.
- Agency-portfolio maximalism where motion is the content and nothing is legible.
- Any implication of metrics the CV does not support (see Confirmed metrics below).
- Cursor-trail / particle-field decoration that signals "creative dev" over "analyst".
- The tracking concept becoming a gimmick that delays the facts.

## Design Principles

1. **Practice what you preach.** A site arguing for measurement must visibly measure.
   Instrumentation is the design, not a feature bolted on.
2. **Numbers before narrative.** Every claim carries a figure and the engagement it came
   from. Facts readable in 10 seconds; depth rewards anyone who stays.
3. **The metaphor must be true.** The funnel reflects real signals. No theater.
4. **Degrade to substance.** With JS off, reduced motion on, or on a slow phone, the
   content still reads completely. The concept is enhancement, never a gate.
5. **Operator, not performer.** Motion is purposeful and controlled. When in doubt,
   restraint beats spectacle: the audience is hiring an analyst.

## Confirmed metrics (hard constraint)

Authoritative, per CV reconciliation 2026-09-22. Nothing else may be published:

- $272K cumulative paid media, across 15-20 concurrent accounts
- 189% average ROAS (portfolio-wide)
- +300% appointment growth, +134% online sales growth, CTR lifted 11% to 43%

Banned: **$940K** (overstatement, must not appear in any form). **18.6x ROAS** is real but
belongs to ONE engagement (Food Crowd, UAE e-commerce grocery) and may appear only in
that client-scoped context, never as a portfolio-wide claim.

## Accessibility & Inclusion

WCAG 2.1 AA. Body text >= 4.5:1, large text >= 3:1, verified in both themes.

- Reduced motion is a first-class path, not a fallback: the stage tracker updates
  instantly instead of animating, and scroll choreography becomes static state.
- The funnel concept is conveyed by text and ARIA state, never by color or position
  alone.
- Full keyboard reachability; visible focus rings on every interactive element.
- Screen reader users get the stage as announced text, not as an unlabeled graphic.
