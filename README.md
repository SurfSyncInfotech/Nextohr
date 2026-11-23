# Nextohr — landing page (React)

React 18 + Vite port of the Nextohr marketing site. Visuals, copy and motion are identical to the approved static version.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/ (static, deploy anywhere)
npm run preview   # serve the build locally
```

Add `?nointro` to the URL to skip the logo intro while developing (it also plays only once per browser session).

## Stack

- **React 18** + **Vite 5**
- **GSAP 3.12 + ScrollTrigger**: all animation
- **Lenis**: the only smooth-scroll engine
- **iconify-icon**: Solar icon set + brand logos (`<Icon name="solar:..." />`)
- Fonts: Manrope + Instrument Serif (Google Fonts, linked in `index.html`)

## Structure

```
index.html              pre-paint script decides if the intro plays (keep it in <head>)
src/
  App.jsx               page composition + shared plan state (plan card → form)
  styles/landing.css    all styles (design tokens at the top: plum #5E0E51, coral #FC8768)
  motion/initLanding.js the whole motion system; returns a cleanup (StrictMode/HMR safe)
  components/
    Logo.jsx            exact Nextohr logo as SVG <symbol> + <Logo/> — always use this, never retype the logo
    Intro.jsx           4.6s logo animation (driven by initLanding)
    Split.jsx           splits headings into words for the reveal animation
    Nav, Hero, Mess, Sentence, Tour, Features, Film, Numbers,
    MobileShowcase, Trust, Plans, Faq, DemoForm, Footer
public/assets/          screenshots (webp), film + poster, favicon, logo svg
```

### How React and the motion layer talk
`initLanding()` runs once from `App`'s `useEffect`. It animates the DOM React renders and communicates through window events:

| Event | Direction | Purpose |
|---|---|---|
| `nx:hero-tabs` (boolean) | motion → Hero | start/stop auto-rotating the hero screens |
| `nx:tour-step` (index) | motion → Tour | pinned scroll sets the active step |
| `nx:tour-goto` ({i, handled}) | Tour → motion | clicking a step scrolls to it (desktop) |

The feature demo cards (`Features.jsx`) are static markup whose numbers/text are animated by the motion layer. Keep their class names.

## Demo form → backend

`DemoForm.jsx` validates client-side and posts JSON to `VITE_FORM_ENDPOINT`:

```bash
cp .env.example .env
# VITE_FORM_ENDPOINT=https://api.example.com/demo-requests
```

Payload: `{ name, company, email, phone, teamSize, plan: "standard" | "white-label", modules: string[] }`.
Without an endpoint, the form only shows the confirmation (nothing is sent).

## Accessibility & motion
- `prefers-reduced-motion: reduce` → no intro, no smooth scroll, final states shown immediately.
- Split headings keep an unsplit `aria-label`; decorative words are `aria-hidden`.
- Fully responsive (checked at 390px and 1440px, no horizontal scroll).

## Placeholders to confirm before launch
- Links: Sign in, footer Company/Legal links (`#`).
- Numbers section values and FAQ answers.
- The film (`public/assets/media/nextohr-film.mp4`) still shows the older brand inside the video.
