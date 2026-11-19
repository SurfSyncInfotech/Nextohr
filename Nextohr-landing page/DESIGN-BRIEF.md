# Nextohr — Landing Page Design Brief

## 1. Reference analysis (what makes them feel premium)

| | melth.care | bustem.com | connect.galantis.com |
|---|---|---|---|
| Built with | Framer · Inter Display + a serif display face · Geist | Framer · Inter | Framer · Everett · Lenis smooth scroll |
| Canvas | Warm off-white `#FCFBF7`, one deep brand green | Pure white, near-black type, one dark CTA | White, electric blue accent, soft grey panels |
| Hero | Big centred serif headline → one CTA → **real product UI** (calendar) under the fold with tabs (Scheduling / Website / Telehealth) | Big headline + email-capture CTA + logo strip + founder video | Headline with two-tone highlight + orbiting integration icons on a dotted arc |
| Storytelling | Problem first: floating chat bubbles ("Did I receive payment…?"), then **app icons scattered around a headline** ("juggle too many tools"), then a big sentence with **inline mini images** between words | Sticky left steps ("We find them / You approve / We take them down") with a **pinned right visual that changes per step** | Numbered pain cards with an animated gradient line, hub diagram connecting systems, bento cards each with a live micro-animation |
| Product showcase | UI rebuilt at full fidelity, then a horizontal row of "how it works" cards over a sky/grass photo | UI fragments composited over a soft grey stage, phone notification stack | Full dashboard mock in a soft frame, cards that animate on scroll |
| Motion | Calm: fade-up, scale-in, scroll-linked colour change of the whole page background | Pinned scroll steps, staggered card reveals, counters | Lenis inertia, line-draw, orbit, subtle parallax |
| Close | Founder letter on paper, big rounded brand CTA panel | FAQ, enormous faded wordmark in footer | Unified CTA, clean footer |

**Common traits to carry over (not copy):** one confident brand colour on a warm neutral canvas · very little text per screen · product UI is the hero visual, shown crisp and large · problem → relief → proof → action pacing · one pinned "how it works" sequence · micro-animations that *demonstrate* features rather than decorate · huge type, generous whitespace, soft 24–32px radii, hairline borders, layered soft shadows.

## 2. Logo analysis — `nextohr`

- **Construction:** monoline, fully-rounded geometric lowercase. Every stroke is the same weight (≈37 units) with round caps → friendly, human, approachable — right for HR. Bowls are slightly taller than wide (44×50), which keeps it modern rather than bubbly.
- **The idea:** the bowl of the **o** doesn't close — it flows out of its base as a ribbon that rises, crosses the **h** ascender and becomes the h's shoulder. *Next* (plum, solid, established) flows *to* **hr** (coral, warm, human). The ribbon is the brand's signature: continuity, flow, "the next step in HR".
- **Colour:** Aubergine plum `#5E0E51` (trust, maturity, premium) → orchid `#B4508F` → coral `#FC8768` (warmth, people). On a blush cream `#FEF2EE`.
- **Weave:** the h ascender sits over the ribbon at 90% opacity, a subtle over/under that gives depth.
- **System decisions:** the ribbon is the one recurring motif on the site (section threads, dividers, CTA glow, loader). Plum is the action colour, coral the human/accent colour, the gradient only where things *flow* (never as a flat background blob).
- **Vector:** rebuilt stroke-by-stroke in `brand/nextohr-logo.svg` (verified by overlaying on the original PNG), so every letter can be drawn on in the intro.

## 3. Intro logo motion (≈4.6 s, skippable, once per session)

| Time | Beat |
|---|---|
| 0.00–0.35 | Blush canvas. A single plum dot appears where the **o** will be. |
| 0.30–1.35 | **n · e · x · t** draw themselves (stroke-dash) left→right with a 0.12 s stagger and a 6px rise, ease `power3.out`. |
| 1.10–1.75 | The dot opens into the **o**, drawn clockwise. |
| 1.65–2.65 | The **ribbon** shoots out of the o's base — plum→orchid→coral — arcs up through where the h will be and down into the h's leg. A soft blurred copy trails it (glow). |
| 2.25–2.75 | The **h ascender** drops in from above with a slight overshoot and lands *over* the ribbon (the weave). **r** draws. |
| 2.75–3.30 | Wordmark settles (scale 1.04→1), light sheen sweeps across. Tagline "HR, in flow." rises underneath. Thin progress line completes. |
| 3.70–4.60 | Exit: the wordmark flies to the nav logo position (FLIP); the blush panel lifts away with a curved clip-path, revealing the hero which starts its own entrance. |

Respects `prefers-reduced-motion` (static logo, 0.6 s fade), click/Esc/scroll to skip, `sessionStorage` so returning visitors in the same session skip it.

## 4. Page structure

1. **Nav** — floating pill (logo · Product · Film · Pricing · FAQ · Sign in · *Start free*), shrinks on scroll.
2. **Hero** — "HR that *flows.*" · one-line sub · 2 CTAs · trust micro-line. Below: the live dashboard in a browser frame that starts tilted in 3D and flattens as you scroll, with floating UI chips (leave approved, payroll done, check-in 9:02) popping around it. Module tabs under it (Dashboard / People / Payroll) swap the screen.
3. **The mess** — "HR shouldn't live in 9 tabs." Sheets, WhatsApp, Gmail, Excel, Calendar, Drive… scattered around the headline; on scroll they get pulled into the Nextohr mark at the centre.
4. **The sentence** — a large scroll-highlighted sentence with inline product thumbnails: "Nextohr tracks attendance [⌖], approves leave [✓], runs payroll [₹] and welcomes new hires [✉] — in one calm place."
5. **Product tour (pinned)** — 5 steps on the left (Attendance · Approvals · Hiring & Onboarding · Payroll · Goals); the right screen cross-fades/zooms per step with a ribbon progress rail.
6. **Built for the details (bento)** — six cards, each with a live micro-animation: ⌘K command palette typing · GPS check-in pin pulse · statutory payroll (PF/ESI/PT/TDS) ticking · approval toasts stacking · offer letter writing itself · profile completeness ring.
7. **The film** — the brag video in a cinematic frame that grows from an inset card to near-full-bleed on scroll; custom play button; lazy-loaded.
8. **Numbers** — counters: 12 modules · < 2 min pay run · 1 inbox for every approval · 0 spreadsheets.
9. **In every pocket** — three phone screens on a parallax row (Dashboard / Attendance / Leave).
10. **Trust** — role-based permissions, audit trail, Indian statutory compliance, data encryption — 4 quiet tiles.
11. **Plans** — "Simple plans. *Priced* on a call." Two cards (Standard / White-label), "Talk to us", what's included, no public prices; crop-mark detailing.
12. **FAQ** — accordion.
13. **Demo form** — "Your next payroll is *already on its way.*" Name, company, work email, phone/WhatsApp, team size, plan, modules to see; validation + confirmation (set FORM_ENDPOINT in main.js to send).
14. **Footer** — links + a giant faded `nextohr` wordmark (drawn on when it enters).

## 5. Stack

Static HTML/CSS/JS (no build step) · GSAP 3.12.5 + ScrollTrigger · Lenis 1.1.13 (only smooth-scroll engine) · Iconify (Solar icons, real tool logos in the "mess" section) · Manrope (matches the product) + Instrument Serif italic for the accent words · no Three.js (product UI is the visual; WebGL would be decoration).
