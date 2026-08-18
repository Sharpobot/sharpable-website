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

## Layout Backups / Alternates

Kept here so a previous layout can be restored on request without digging through git history. The full pre-redesign state is also always retrievable via `git show 276ebc4:src/App.jsx` (the commit right before the hero/copy/polish pass).

### Original centered Hero (pre "IntelliAgents-style" desktop layout)

Replaced during the 2026 polish pass with a desktop-only left-aligned layout (see current `Hero()`). If asked to revert to the centered version, restore this — note it also has the **old** description copy ("Sharpable designs and builds premium... No templates. Ever.") baked in; swap in the current copy from `Hero()` if only the layout (not the copy) should change back:

```jsx
function Hero() {
  const heroRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-line-1', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.3 })
      gsap.from('.hero-line-2', { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out', delay: 0.5 })
      gsap.from('.hero-cta, .hero-meta', {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.8,
        stagger: 0.12,
      })
    }, heroRef)
    return () => ctx.revert()
  }, [])

  return (
    <section id="home" ref={heroRef} className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=2400&q=80"
          alt="Designer working on a laptop in a dark studio"
          className="w-full h-full object-cover brightness-[0.55]"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-deep/85 via-deep/50 to-primary/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/30 to-transparent" />
      </div>

      {/* Decorative floating sparks */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-[18%] h-2 w-2 rounded-full bg-primary/60 animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[55%] right-[10%] h-1.5 w-1.5 rounded-full bg-white/40 animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[40%] right-[26%] h-1 w-1 rounded-full bg-primary-light/70 animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Top frame */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center text-center">
        <div className="px-6 sm:px-10 lg:px-16 max-w-4xl">
          <p className="hero-meta font-mono text-xs uppercase tracking-[0.3em] text-white/60 mb-6">
            Web Design Studio
          </p>
          <h1 className="font-display font-extrabold text-white leading-[0.95] tracking-tight">
            <span className="hero-line-1 block text-4xl sm:text-5xl md:text-6xl">
              Websites that make small businesses
            </span>
            <span
              className="hero-line-2 block font-serif italic font-medium text-primary text-6xl sm:text-7xl md:text-8xl lg:text-9xl mt-2"
              style={{ lineHeight: '0.92' }}
            >
              look big.
            </span>
          </h1>

          <p className="hero-meta mx-auto max-w-xl text-white/75 text-base sm:text-lg mt-8 leading-relaxed">
            Sharpable designs and builds premium, fast-loading websites for small businesses —
            custom code, sharp animation, and design that's built to convert.
            <span className="text-white"> No templates. Ever.</span>
          </p>

          <div className="hero-cta mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#contact"
              className="magnetic-btn group inline-flex items-center justify-center gap-2 bg-primary text-deep font-semibold px-7 py-4 rounded-full shadow-2xl shadow-primary/40"
            >
              Get a quote
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="tel:+60195806090"
              className="lift-on-hover inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 font-medium px-7 py-4 rounded-full"
            >
              <Phone className="h-4 w-4" />
              +6019 580 6090
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 right-6 sm:right-12 hidden md:flex flex-col items-center gap-2 text-white/50">
          <span className="font-mono uppercase text-[10px] tracking-[0.3em]">Scroll</span>
          <div className="h-8 w-px bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </div>
    </section>
  )
}
```
