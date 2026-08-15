# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sharpable** is a marketing/business website for a web design studio ("premium websites for small businesses"). It's a **React 19 + Vite + Tailwind CSS single-page site** with two extra static routes for legal pages, client-side routed via `react-router-dom`. There is no backend — the contact form is currently a UI-only stub (see Known Gaps below).

This repo was migrated from an old GitHub account (`FriezerGH/Sharpable`) to a new one (`Sharpobot/sharpable-website`) via a local bare-mirror clone+push. **The git remote `origin` currently still points to that local mirror path** (`C:\Users\Amrishak\repo-transfer\Sharpable.git`), not to GitHub — repoint it to `https://github.com/Sharpobot/sharpable-website.git` before relying on `git push`/`git pull` against GitHub.

A sister project, **IntelliAgents** (`C:\Users\Amrishak\Projects\intelliagents-reference`, from `Sharpobot/Intelliagents-reference` on GitHub), shares the identical tech stack and is being used as a design/feature reference — pulling specific sections/animations from it into this site on request, rather than a wholesale redesign.

## Development Commands

Standard Vite project — from the project root:

- `npm install` — install dependencies
- `npm run dev` — start the dev server (Vite default port `5173`, auto-increments to the next free port if occupied — check actual bound port before assuming 5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — ESLint (flat config, `eslint.config.js`)

No TypeScript (despite `@types/react`/`@types/react-dom` in devDependencies — those are editor-IntelliSense-only), no test suite, no CI configured yet.

## High-Level Architecture

- **`src/main.jsx`** — entry point. Wraps everything in `BrowserRouter` with three routes:
  - `/` → `App` (the entire one-page marketing site)
  - `/privacy` → `PrivacyPolicy`
  - `/terms` → `Terms`
- **`src/App.jsx`** (~1,500 lines) — the entire marketing site lives here as a flat sequence of component functions in one file, assembled in the default-exported `App()` at the bottom. **Unlike the IntelliAgents reference project, there is no `components/` folder** — everything (including small decorative widgets) is defined inline in this single file.
- **`src/pages/PrivacyPolicy.jsx`** / **`src/pages/Terms.jsx`** — standalone static legal pages, same visual shell (logo + "Back to home" link + dated sections), not otherwise linked into `App.jsx`'s content.

### Section order inside `App.jsx` (top to bottom of the page)

`Navbar` (fixed/floating) → `Hero` → `Features` (3 animated feature cards) → `Pillars` (stat counters) → `Protocol` (sticky stacking 3-step process) → `ServicesGrid` (dark 6-service band) → `TrustSignals` (3 trust badges) → `ContactForm` → `Footer`.

## Design System

Defined in `tailwind.config.js` under `theme.extend`:

```js
primary: '#D4AF37'        // gold — the sole accent color
primary-dark: '#B8941F'
primary-light: '#E8CC6E'
accent: '#F5E6C8'          // cream
accent-dark: '#D9C49A'
background: '#0B0B0C'      // near-black page background
surface: '#161618'         // card/panel background
deep: '#050505'            // darkest band background (footer, ServicesGrid)
ink: '#FAFAFA'              // near-white text
muted: '#9C9C9F'            // secondary text
divider: '#2A2A2D'          // hairline borders
```

**Fonts** (Google Fonts, loaded via `<link>` in `index.html` — not self-hosted):
- `font-display` → **Plus Jakarta Sans** — headings
- `font-serif` → **Cormorant Garamond**, always used *italic* — the recurring accent phrase at the end of headings (e.g. "…look **big.**", "Let's make it **Sharpable.**")
- `font-body` → **Inter** — body copy
- `font-mono` → **JetBrains Mono** — uppercase letter-spaced eyebrows/labels/badges throughout

**Signature typographic motif**: nearly every section heading pairs a bold sans-serif line with an italic serif accent line in `primary-dark`. This pattern repeats in Hero, Features, Pillars, Protocol, ContactForm, and Footer — treat it as the site's core visual identity, not a one-off.

**Custom radii** (`tailwind.config.js`): `2.5xl`/`4xl`/`5xl`/`6xl`/`7xl` — the very rounded card/section aesthetic used everywhere is deliberate, not default Tailwind.

**Custom utility classes** (`src/index.css`, `@layer components`):
- `.magnetic-btn` — hover scale + diagonal shine sweep, used on all primary CTA buttons
- `.lift-on-hover` — small translateY lift on hover
- `.glass` / `.glass-dark` — backdrop-blur glass panels (navbar uses `.glass` once scrolled)
- `.grid-bg` — faint gold grid-line background texture (Pillars, ServicesGrid, Footer)
- `.noise-overlay` — fixed full-viewport SVG turbulence noise texture at 5% opacity, `mix-blend-mode: overlay`, applied once at the top of `App()`
- `.ring-pulse` — pulsing box-shadow ring keyframe

## Notable Component Behaviors

- **`DesignShuffler`, `BuildScanner`, `StrategyScheduler`** (inside `Features`) — three self-contained decorative widgets, each auto-cycling on its own `setInterval` to simulate a "live product" (shuffling mockup cards, a fake CI build pipeline, an animated calendar-booking flow). None use GSAP — plain CSS transitions/keyframes and React state.
- **`BuildScanner`** is the most elaborate of the three: a fake build-pipeline visualization with falling code-bracket SVGs ("rain"), scanline ripple pulses, and a 4-stage status cycle (Designing → Building → Optimizing → Shipped). Its keyframes are scoped locally via an inline `<style>` tag rather than living in `index.css`.
- **`Protocol`** uses **GSAP `ScrollTrigger` with `scrub`** to pin and stack its 3 process-step cards as the user scrolls — each earlier card scales down, blurs, and fades as the next one covers it. This is the most complex animation in the file; the rest of the site's scroll-reveals use plain `IntersectionObserver` (see `Pillars`, `TrustSignals`) rather than GSAP.
- **`CountUp`** — drives the big stat numbers in `Pillars` via `requestAnimationFrame` + eased interpolation, triggered once by its own `IntersectionObserver`.
- **`ContactForm`** is **UI-only** — `handleSubmit` fakes a 1200ms "sending" delay then flips to a static "sent" confirmation state. There is no real backend/email integration. The drag-and-drop file attachment (up to 5 images) only holds files in local component state for display — nothing is uploaded anywhere.
- Business contact details are hardcoded in two places (`ContactForm` and `Footer`) — phone `+6019 580 6090`, email `sharpablehq@gmail.com`, "Kuala Lumpur — Malaysia". Keep both in sync if either changes.

## Known Gaps / Things a Future Session Should Know

- **No real contact form backend.** Needs something wired up (e.g. a Supabase table + insert, similar to the pattern used on other Aidid Marcello projects, or a simple email API) before this can go live as a functioning lead form.
- **No deployment configured.** No `netlify.toml`, no `vercel.json`, no CI — this project hasn't been deployed anywhere yet.
- **`git remote origin` points to a local filesystem path**, not GitHub (see Project Overview) — fix this before assuming `git push`/`pull` reach GitHub.
- **Privacy Policy content is aspirational, not accurate yet** — it states user data "is stored securely" and describes retention practices, but since the contact form doesn't actually store or send submissions anywhere yet, that copy will need revisiting once a real backend exists. Both legal pages are also generic placeholder text (dated "June 2026") that hasn't had legal review.
- `package-lock.json` shows as locally modified immediately after a fresh `npm install` in this environment — appears to be routine lockfile churn, safe to commit/ignore.
