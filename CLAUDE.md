# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sharpable** is a marketing/business website for a web design studio ("premium websites for small businesses"). It's a **React 19 + Vite + Tailwind CSS single-page site** with two extra static routes for legal pages, client-side routed via `react-router-dom`. The whole homepage is **fully bilingual (English/Bahasa Melayu)** via a custom i18n system — see the "Internationalization" section below. There is no backend — the contact form is currently a UI-only stub (see Known Gaps below).

This repo was migrated from an old GitHub account (`FriezerGH/Sharpable`) to a new one (`Sharpobot/sharpable-website`) via a local bare-mirror clone+push. **`git remote origin` correctly points to `https://github.com/Sharpobot/sharpable-website.git`.**

**GitHub auth gotcha (hit repeatedly this project — check this first if `git push` 403s):** this machine's `gh` CLI has multiple accounts logged in (`Aidid-Marcello`, `AliffDanish`, `Sharpobot`), and the **active** one silently reverts to `Aidid-Marcello` between sessions/restarts — which does not have write access to this repo and fails with `Permission to Sharpobot/sharpable-website.git denied`. Fix before pushing: `gh auth switch --hostname github.com --user Sharpobot`, then `git push` normally. Check with `gh auth status` if unsure which account is active. **See `GITHUB-AUTH-SETUP.md`** (repo root) for the full picture — how this got set up in the first place (device-flow login, run by Claude's own tool, not the user's terminal), how to add a different account from scratch if ever needed, and a documented PAT alternative.

Several **outside reference projects** get pulled from for specific features/effects on request (never a wholesale redesign, always a targeted "take this one thing and adapt it" ask) — worth knowing they exist in case a future session is asked to reference them again:
- **IntelliAgents** (`C:\Users\Amrishak\Projects\intelliagents-reference`, from `Sharpobot/Intelliagents-reference` on GitHub) — a sister project, identical tech stack (React 19 + Vite + Tailwind). Source of the language-switcher pattern (see Internationalization).
- **An older, unused Sharpable site** (`D:\ALIFF MC\Website Coding\Older Sharpable Site made by Aqeel\index.html`) — plain HTML/CSS/JS, not this codebase's stack. Source of the `Transformation` before/after carousel effect *and* its real client images/copy, and the `Testimonials` section's real quotes/avatar, and the slim scrollbar style. Also has its own bilingual `data-ms`/`data-en` attribute pattern (different mechanism from this project's React context, but same underlying real content) — worth checking there first before assuming new content needs to be invented from scratch.
- **A portfolio template project** (`D:\ALIFF MC\Website Coding\MotionSite Templates\Portfolio Templates\AI Designer Portfolio\`, a separate React+TypeScript+Vite project) — original source of the `Testimonials` carousel's mechanics (`src/components/TestimonialCarousel.tsx` there); largely superseded now that `Testimonials.jsx` was rewritten onto native scroll-snap (see Notable Component Behaviors) but kept here for history.
- **`Aidid-Marcello/aididitmyway-website`** on GitHub (private repo) — a podcast site, plain HTML/CSS/JS, no framework. Source of `ServicesGrid`'s mobile "journey" scroll-synced timeline (see Notable Component Behaviors). **This repo is only visible under the `Aidid-Marcello` GitHub account, not `Sharpobot`** — `gh repo list Sharpobot` won't show it; use `gh auth switch --hostname github.com --user Aidid-Marcello` first, `gh repo clone Aidid-Marcello/aididitmyway-website` to pull it into a scratch dir, then **switch back to `Sharpobot` immediately after** (`gh auth switch --hostname github.com --user Sharpobot`) before doing anything else in this repo, or the next `git push` will 403. Its own `CLAUDE.md` documents the Journey section in detail (`.journey-item`, `.journey-fade`, `updateJourneyLines()` in `script.js`) if a future session needs to re-check the original mechanics.

## Development Commands

Standard Vite project — from the project root:

- `npm install` — install dependencies
- `npm run dev` — start the dev server (Vite default port `5173`, auto-increments to the next free port if occupied — check actual bound port before assuming 5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — ESLint (flat config, `eslint.config.js`)

No TypeScript (despite `@types/react`/`@types/react-dom` in devDependencies — those are editor-IntelliSense-only), no test suite, no CI configured yet.

**Dev server dies frequently between turns in this tool environment** (background process gets killed when the session/turn boundary resets) — this is routine, not a bug to chase. Expect to restart it often: check `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*sharpable-website*" }` (PowerShell) before assuming it's still running, restart with `npm run dev` in the background if not, confirm the bound port via `Get-NetTCPConnection`, then open/reconnect the browser preview. **After any `tailwind.config.js` color change specifically**, a plain restart isn't always enough either — hard-navigate the browser tab (not just re-check) before trusting computed colors.

**Stale Tailwind/Vite cache gotcha (hit repeatedly in one session, cost real time each time)**: after editing a component to use a **new arbitrary-value class** that didn't exist anywhere in the codebase before (e.g. `pb-[clamp(4.5rem,16vh,8rem)]`, `-mx-[3rem]`), a plain dev-server restart sometimes serves a stale bundle that's missing the new utility entirely — the class sits correctly in the JSX/DOM, but `getComputedStyle` shows browser defaults (e.g. `position: relative` instead of `sticky`, `margin-top: 0px` instead of the intended negative value) as if the class were never generated. This reads exactly like a real positioning bug and is easy to chase down the wrong path. **Fix**: `rm -rf node_modules/.vite` before restarting (`Stop-Process` the node process first, delete the cache dir, then `npm run dev` again) — this forces Tailwind/Vite to fully re-scan and re-bundle rather than reuse a cache that predates the new class. **Always verify** any brand-new arbitrary-value class actually compiled (check `getComputedStyle` in the browser) before concluding a positioning/sizing bug is a real logic error rather than this cache issue — this exact false alarm happened more than once.

**Programmatic scroll doesn't reliably fire native events in this tool's Browser pane** — `window.scrollTo()`/`scrollBy()`/`Element.scrollIntoView()` move the actual scroll position but frequently don't dispatch the `'scroll'` event, don't run `requestAnimationFrame` callbacks reliably, and don't trigger `position: sticky` re-resolution — all things a real user's scroll input does automatically. This makes JS-driven scroll simulation useless for verifying anything scroll-linked (GSAP ScrollTrigger, the Testimonials carousel's wrap logic, ServicesGrid's mobile journey spine, any `position: sticky` element). **What actually works**: a real simulated gesture via the `computer` tool's `scroll` action (max `scroll_amount: 10` per call, batch several via `browser_batch` to cover distance), then `computer{action:"screenshot"}` to confirm visually — or `computer{action:"scroll_to", ref: "..."}` using a ref from `read_page`/`find` to jump to a specific element reliably (far more precise than blind pixel-scrolling or the broken `scrollIntoView`). Also worth knowing: the Browser pane sometimes reports itself as not compositing frames at all (`document.hidden === true`, screenshots time out, `requestAnimationFrame` never fires) for stretches of a session for reasons outside this tool's control — retry later in the same session rather than assuming a fix is needed; when it's confirmed hidden, fall back to direct DOM/computed-style assertions instead of visual checks, and say so explicitly rather than claiming a visual check happened when it didn't.

## High-Level Architecture

- **`src/main.jsx`** — entry point. Wraps everything in `LanguageProvider` (i18n context, see below) then `BrowserRouter` with three routes:
  - `/` → `App` (the entire one-page marketing site)
  - `/privacy` → `PrivacyPolicy`
  - `/terms` → `Terms`
- **`src/App.jsx`** — a slim ~35-line orchestrator: imports every section component and lays them out in order. **Refactored out of a single 1,600+ line file** into one-component-per-file under `src/components/` (each section, plus small decorative widgets like `DesignShuffler`/`BuildScanner`/`StrategyScheduler`/`CountUp`/`WorkPreview`/`Field`, all get their own file). Shared data (`SERVICE_ICONS`) lives in `src/constants.js` — the actual copy for those services lives in the translations, not constants.js.
- **`src/pages/PrivacyPolicy.jsx`** / **`src/pages/Terms.jsx`** — standalone static legal pages, same visual shell (logo + "Back to home" link + dated sections), not otherwise linked into the main site's content, and **not translated** (English-only, matching the same choice IntelliAgents made for its own legal pages).

### Section order inside `App.jsx` (top to bottom of the page)

`Navbar` (fixed/floating) → `Hero` → `Features` (3 animated feature cards) → `Pillars` (stat counters) → `Protocol` (sticky stacking 3-step process) → `ServicesGrid` (dark 6-service band) → `Work` (2-project alternating-rows showcase) → `Transformation` (before/after peek carousel) → `Testimonials` (infinite-loop carousel) → `TrustSignals` (3 trust badges) → `ContactForm` → `Footer`.

## Internationalization (English / Bahasa Melayu)

- **`src/translations.js`** — the single source of truth for every piece of user-facing copy on the homepage, nested under `en` and `ms` top-level keys, mirroring each section (`hero`, `features`, `pillars`, `protocol`, `servicesGrid`, `work`, `transformation`, `trust`, `contact`, `footer`, `nav`). **When adding a new section or piece of copy, add it here first** — both languages, kept close in length (not dramatically shorter/longer) so layouts don't visually break between languages.
- **`src/language-context.js`** — just the `LanguageContext` (`createContext`), isolated in its own plain `.js` file.
- **`src/useLanguage.js`** — the `useLanguage()` hook (`{ lang, t, toggleLang }`), also isolated in its own file.
- **`src/i18n.jsx`** — just the `LanguageProvider` component (persists choice to `localStorage` under `sharpable-lang`, sets `document.documentElement.lang`).
- **Why split across four files**: React Fast Refresh's ESLint rule (`react-refresh/only-export-components`) errors if a single file exports both components and non-component values (hooks, contexts, data) together — hence data / context / hook / provider each got their own file rather than living together like IntelliAgents' single `i18n.jsx`.
- **Content-vs-logic separation matters here**: some widgets have data that's partly translatable (text) and partly not (icons, target numbers, tone/color). Pattern used throughout: keep a small local array of the *non-translatable* parts (e.g. `TARGETS` in `Pillars.jsx`, `TONES` in `BuildScanner.jsx`, `IMAGES` in `Protocol.jsx`, `SERVICE_ICONS` in `constants.js`) and `.map()` it together with `t.section.items` at render time — never store translated strings in component state that needs to survive a language switch (see next point).
- **Gotcha already hit once**: don't put translated array items directly into rotating/reorderable `useState` (e.g. a carousel's "current stack order") — when the language toggles, the array reference changes but old state still holds stale-language objects, and syncing via a `useEffect(() => setState(newItems), [items])` trips the `react-hooks/set-state-in-effect` lint rule (and is a real anti-pattern). Fix used in `DesignShuffler.jsx`: store rotation as an array of **indices** (`[0,1,2]`), which are language-independent, and look up `items[idx]` fresh at render time.
- **Toggle UI**: `Navbar.jsx` has the switcher — desktop: `EN / BM` pill button with a `Languages` icon in the main nav row, ported from the IntelliAgents reference project's identical pattern. **Mobile is deliberately different from IntelliAgents**: a compact `EN`/`BM` button sits directly in the top bar immediately left of the hamburger icon (for one-tap access), *not* inside the slide-down menu — it used to be a full-width "Switch to Bahasa Melayu" button inside the mobile menu, moved out on request since burying it in the menu made it slower to reach.

## Design System

Defined in `tailwind.config.js` under `theme.extend`:

```js
primary: '#FFC629'        // vibrant gold-yellow — the sole accent color
primary-dark: '#F0B300'   // secondary/supporting-text tier of the same accent
primary-light: '#FFDD70'
accent: '#F5E6C8'          // cream
accent-dark: '#D9C49A'
background: '#16161A'      // dark charcoal page background
surface: '#202024'         // card/panel background
deep: '#0F0F12'            // darkest band background (footer, ServicesGrid)
ink: '#FAFAFA'              // near-white text
muted: '#9C9C9F'            // secondary text
divider: '#38383D'          // hairline borders
```

**These values have moved several times already this project** — originally a much darker/near-black, near-muted-gold palette; lightened + made more vibrant on request; background pulled back darker after "too light" feedback while *keeping* the more vibrant gold; `primary-dark` brightened once more (`#D69600` → `#F0B300`) after it read as "muddy" next to the brighter accent spans. **`primary-dark`'s role is deliberate, not a mistake to "fix" by matching it to `primary`**: it's the secondary/supporting tier (eyebrow labels, tag pills, feature-card sub-lines, protocol taglines) versus `primary` for headline accents/CTAs/buttons — that two-tier split is real visual hierarchy. If it ever looks inconsistent again, first check it's genuinely inconsistent (grep `text-primary-dark` across `src/components/` — as of this writing it's already 100% one token, no drift) before assuming it needs unifying with `primary`. **If asked to touch these values again**: (1) update `tailwind.config.js` first — that's the single source of truth; (2) then grep for hardcoded hex/rgba duplicates of the old values in `src/index.css` (`::selection`, scrollbar, `.glass`/`.glass-dark`, `.gradient-text`, `.grid-bg`, `.ring-pulse`) and inline in `BuildScanner.jsx`/`DesignShuffler.jsx` (SVG fills/JS color logic can't use Tailwind classes) — these do **not** update automatically, `sed -i 's/#OLDHEX/#NEWHEX/g'` across those files is the fast way; (3) **a plain HMR update is not enough for Tailwind config color changes** — kill and restart the dev server, then hard-navigate the browser tab, or you'll keep reading stale computed colors and think the edit didn't take effect (this has happened repeatedly in this project — always verify via `getComputedStyle(...).color` in the browser after a config color change, never trust that the edit alone was sufficient).

**Scrollbar** (`src/index.css`, `::-webkit-scrollbar*`): deliberately swapped from a thick 10px rounded-pill scrollbar to a slim 3px bar with a 2px radius and no hover-darken, matching an older Sharpable site's minimal scrollbar look — colors still come from this project's own tokens (`background`/`primary`), not the old site's.

**Fonts** (Google Fonts, loaded via `<link>` in `index.html` — not self-hosted):
- `font-display` → **Plus Jakarta Sans** — headings
- `font-serif` → **Cormorant Garamond**, always used *italic* — the recurring accent phrase at the end of headings (e.g. "…look **big.**", "Let's make it **Sharpable.**")
- `font-body` → **Inter** — body copy
- `font-mono` → **JetBrains Mono** — uppercase letter-spaced eyebrows/labels/badges throughout

**Signature typographic motif**: nearly every section heading pairs a bold sans-serif line with an italic serif accent line in `primary` (the bright gold — all such accent spans were unified onto `primary` rather than a mix of `primary`/`primary-dark`, on request, for visual consistency). This pattern repeats in Hero, Features, Pillars, Protocol, ServicesGrid, Work, Transformation, ContactForm, and Footer — treat it as the site's core visual identity, not a one-off. These accent spans also got deliberately enlarged beyond their parent heading's size (e.g. `text-4xl sm:text-5xl md:text-6xl` heading with a `text-5xl sm:text-6xl md:text-7xl` accent span) — keep new headings proportionate to this if you add one.

**Custom radii** (`tailwind.config.js`): `2.5xl`/`4xl`/`5xl`/`6xl`/`7xl` — the very rounded card/section aesthetic used everywhere is deliberate, not default Tailwind.

**Custom utility classes** (`src/index.css`, `@layer components`):
- `.magnetic-btn` — hover scale + diagonal shine sweep, used on all primary CTA buttons
- `.lift-on-hover` — small translateY lift on hover
- `.glass` / `.glass-dark` — backdrop-blur glass panels (navbar uses `.glass` once scrolled)
- `.grid-bg` — faint gold grid-line background texture (Pillars, ServicesGrid, Footer)
- `.noise-overlay` — fixed full-viewport SVG turbulence noise texture at 5% opacity, `mix-blend-mode: overlay`, applied once at the top of `App()`
- `.ring-pulse` — pulsing box-shadow ring keyframe

## Notable Component Behaviors

- **`Hero`** — background image is a monitor displaying a colorful design-system/UI interface (not code) with plants on the desk, deliberately chosen **not** to show literal programming code — a manager request, since a code-heavy background risked reading as intimidating to non-technical small-business clients and doesn't reflect how the studio actually builds sites. Overlay is darkened fairly heavily (`brightness-[0.4]` on the `<img>`, plus two stacked gradients at `/95`, `/70`, and `/50` opacity — noticeably stronger than earlier passes) so the image reads as ambient texture behind the text rather than competing with it; only the top-right corner stays relatively bright. If the image is ever swapped again, other directions considered (and worth revisiting): a client-outcome shot (a small-business owner happily using their new site) instead of a studio-process shot; a fully analog/no-screen creative-process shot (sketching, moodboards — though Protocol's own "Discovery" step already uses a sticky-notes photo, so this risks feeling repetitive); a pure abstract/graphic background instead of a photo at all.
- **`Navbar`** — mobile floating-pill nav could visibly clip/jump during scroll on some mobile browsers as their address bar auto-hides (a real cross-browser rendering quirk, not device-specific): `html`/`body` overflow handling and `position: fixed` interact in ways that make the fixed nav's containing-block resolution unstable mid-scroll. Fixed two ways: (1) `overflow-x: hidden` moved from `body` to `html` in `index.css` (the combination of `overflow-x:hidden` on `body` specifically plus `position:fixed` descendants is the more failure-prone pairing on WebKit); (2) the nav itself is forced onto its own GPU-composited layer via an explicit `translate3d(-50%, 0, 0)` inline transform (replacing the old `-translate-x-1/2` Tailwind class, which resolves to a 2D-only transform) plus `will-change-transform`, so it stays stable through the browser's own toolbar-collapse animation instead of being repainted mid-transition.
- **`DesignShuffler`, `BuildScanner`, `StrategyScheduler`** (inside `Features`) — three self-contained decorative widgets, each auto-cycling on its own `setInterval` to simulate a "live product" (shuffling mockup cards, a fake CI build pipeline, an animated calendar-booking flow). None use GSAP — plain CSS transitions/keyframes and React state.
- **`BuildScanner`** is the most elaborate of the three: a fake build-pipeline visualization with falling code-bracket SVGs ("rain"), scanline ripple pulses, and a 4-stage status cycle (Designing → Building → Optimizing → Shipped). Its keyframes are scoped locally via an inline `<style>` tag rather than living in `index.css`.
- **`Protocol`** uses **GSAP `ScrollTrigger` with `scrub`** to pin and stack its 3 process-step cards as the user scrolls — each earlier card scales down, blurs, and fades as the next one covers it. This is the most complex animation in the file; the rest of the site's scroll-reveals use plain `IntersectionObserver` (see `Pillars`, `TrustSignals`) rather than GSAP.
- **`CountUp`** — drives the big stat numbers in `Pillars` via `requestAnimationFrame` + eased interpolation, triggered once by its own `IntersectionObserver`.
- **`ContactForm`** is **UI-only** — `handleSubmit` fakes a 1200ms "sending" delay then flips to a static "sent" confirmation state. There is no real backend/email integration. The drag-and-drop file attachment (up to 5 images) only holds files in local component state for display — nothing is uploaded anywhere.
- Business contact details are hardcoded in two places (`ContactForm` and `Footer`) — phone `+6019 580 6090`, email `sharpablehq@gmail.com`, "Kuala Lumpur — Malaysia". Keep both in sync if either changes (these are **not** translated — a phone number/email doesn't need it, but if the display of `t.contact.location` string changes, check both spots).
- **`Work`** — 2-project alternating-rows showcase (image alternates left/right per row via `WorkPreview`, now a real `<img>` — stock Unsplash photos of the relevant business type, e.g. a bakery interior, a gym — not the abstract CSS "browser mockup" it started as). **Project names/blurbs are still intentionally fictional/placeholder** (e.g. "Local Bakery Rebrand") since the studio doesn't have real case studies loaded in yet — deliberately avoids fabricated stats (no "+68% conversions" style claims). Swap in real project names/results/screenshots when available; `IMAGES` array at the top of `Work.jsx` holds the current stock-photo URLs (not translatable, so kept out of `translations.js`).
- **`Transformation`** (`src/components/Transformation.jsx`) — a 3-card "peek" carousel (center card full-size, left/right cards scaled-down/blurred/peeking, everything else hidden) with a draggable before/after image-comparison slider on each card's front face, and a 3D flip (only when centered) revealing case-study copy on the back. **Ported from an older, unused Sharpable site** (`D:\ALIFF MC\Website Coding\Older Sharpable Site made by Aqeel\index.html`, section `id="transformation"`, class prefix `.ba-*`) — same interaction mechanics (CSS `clip-path` slider synced to a hidden `<input type=range>`, a "locked" flag so only drags starting near the visible drag-handle actually move the slider, touch-swipe navigation, index-based left/center/right/hidden positioning). **Now uses the old site's actual real before/after client screenshots** (Sizara Motorsports, Aidid Marcello, Tarbiah Sentap — via `<picture>` with a `(max-width:639px)` mobile source, matching Tailwind's `sm:` breakpoint used for the container's own aspect-ratio switch so the two never fall out of sync) **and its matching real flip-back copy**, ported verbatim into `translations.js` rather than the earlier fictional placeholder text — these are genuine past client results, not invented ones. Image URLs live in the `CARD_IMAGES` array in `Transformation.jsx` (not translatable). All 11 image URLs live on the `da3lqh4dl` Cloudinary account and were individually verified live before reuse — that account has had at least one prior migration/deletion event in an unrelated project, so re-verify before reusing again if it's been a while. **Deliberately stays horizontal (peek-carousel, not a stacked layout) at every breakpoint** — only the max-width and aspect-ratio scale down for mobile, matching an explicit "stay horizontal and consistent on mobile" requirement; this project's carousel also keeps the prev/next arrow buttons visible at all breakpoints (the old site hid them under `768px` and relied on swipe-only), a deliberate accessibility improvement. Front/center card enlarged (`max-w-[820px]` desktop, `max-w-[340px]` mobile — up from `720px`/`310px`) with the arrow gap widened to match (`gap-12` desktop / `gap-5` mobile, up from `gap-4` both), and the peeking side cards darkened/faded more (`opacity-45 blur-[4px] brightness-[0.45]`, up from `opacity-100 blur-[3px]`) so they read as clearly receded rather than competing with the front card. Dot indicator is the shared `SliderDots` component (see below), no progress timer since this carousel doesn't auto-advance.
- **`SliderDots`** (`src/components/SliderDots.jsx`) — shared position indicator used by both `Transformation` and `Testimonials`, a segmented "story bar" (Instagram-Stories-style) rather than separate pill/dot shapes: one continuous row of thin bar segments, segments before the active index filled solid (`bg-primary-dark`), the active segment filled with a `from-primary to-primary-light` gradient, everything after left empty. Pass `progressMs` (+ `paused`) to get an **animated** fill on the active segment via the shared `slider-dot-fill` CSS keyframe in `index.css` (0%→100% width, restarted via a `key={active}` remount) — this is what `Testimonials` uses for its 7s auto-advance countdown; omit both props for an **instant** full-width fill instead (what `Transformation` uses, since it has no auto-advance timer). Went through several design directions before landing here — a companion exploration artifact comparing 8 different indicator styles (sliding rail, numbered tabs, ringed dots, architectural ticks, fraction counter, segmented bar, orbiting dash) was built and is referenced in Known Gaps below if that gallery is ever wanted again for a different component.
- **`Testimonials`** (`src/components/Testimonials.jsx`) — **rewritten mid-project onto native CSS scroll-snap** (`overflow-x: auto; scroll-snap-type: x mandatory`), replacing an earlier `translateX`-based carousel ported from a different reference project (`AI Designer Portfolio`'s `TestimonialCarousel.tsx`) that had accumulated several hard-to-fix bugs — kept as project history since the general "tripled array for infinite loop" concept survived the rewrite even though the implementation didn't. **5 testimonials now** (2 real — Sizara Motorsports, Aidid Marcello — plus 3 clearly-fictional placeholders — Bloom & Co., The Coffee Refinery, Roda Bicycle Co. — added on request specifically to fix a "looks glitchy with only 2" loop problem; swap for real quotes as they become available, never invent stats). Card sizing is now measured off the scroller's own `clientWidth` via `ResizeObserver` rather than `window.innerWidth` (desktop: `min(540, clientWidth*0.62)`; mobile: `clientWidth - 16`), with the peek/fade sidePad computed as the remainder — this replaced an earlier window-width heuristic that didn't account for the container's own padding.
  - **Infinite loop**: array tripled (`[...items, ...items, ...items]`) purely as scroll buffer; the wrap-correction (`settle()`) only fires within one card of the *true* ends of that tripled array (`raw <= 0` / `raw >= total-1`), not at every crossing into a neighboring copy — the original version corrected on literally the first step past the perceived first/last testimonial, which is why it used to "snap" on almost every boundary interaction. `jumpTo()` performs the actual correction: briefly sets `scroll-snap-type: none` + `scroll-behavior: auto`, sets `scrollLeft` instantly, restores both via `setTimeout` (not `requestAnimationFrame` — a background/hidden tab suspends rAF but not `setTimeout`, so this keeps the reset reliable even if the tab loses focus mid-jump). `overscroll-behavior-x: contain` is the graceful fallback if a user somehow out-swipes the buffer (hard stop, no rubber-band bounce, rather than scrolling into visible emptiness).
  - **Active-card highlight is decoupled from the wrap-tracking index** — a separate `visualIndex` state, updated on every `'scroll'` event (rAF-throttled) independent of the debounced `settle()`/wrap logic, drives each card's `opacity`/`scale`. Without this split the highlight visibly lagged the finger by however long the settle-debounce took, reading as a jarring "pop" right at the loop boundary where it coincided with the wrap-correction jump.
  - **Edge fade is two overlay `<div>`s** (`bg-gradient-to-r/l from-background to-transparent`, sized to the live `sidePad` so they cover the *entire* peek width, not a fixed guess), not `mask-image` — an earlier `mask-image` approach caused visible banding/tiling artifacts once the fade was widened past a few percent, a known Chromium issue with masking a wide gradient onto a scrollable (`overflow-x:auto`) element specifically. If a fade effect is ever needed elsewhere on a scrollable container, use the overlay-div technique from the start rather than rediscovering this.
  - **Programmatic navigation** (arrows, dots, 7s auto-advance) uses a custom `requestAnimationFrame`-driven eased scroll (`animateScrollTo`, `cubic-bezier`-equivalent via `easeInOutCubic`, `SCROLL_DURATION_MS = 750`) rather than native `scrollTo({behavior:'smooth'})`, which has no controllable duration and reads as too abrupt over this card's travel distance. Direct user swipes still use native scroll-snap physics untouched.
  - Aidid's avatar 404s on the old Cloudinary account — `Avatar` has a graceful `onError` fallback to a 2-letter initials badge. Star rating is 5 stars rendered fresh per card via a `Stars` sub-component.

- **`ServicesGrid`** (`src/components/ServicesGrid.jsx`) — desktop/tablet (`sm:` and up) is the original 6-tile grid, completely unchanged. **Mobile (`sm:hidden`) is a scroll-driven "journey" timeline**, ported from `Aidid-Marcello/aididitmyway-website`'s Journey section (see reference-projects list above) — deliberately chosen over a static accordion/list because it stays visually interesting even when the user isn't actively tapping anything, which a collapsed list doesn't. Ported as faithfully as possible (exact spacing values carried over, not just the general idea) after an earlier attempt that improvised its own proportions turned out visibly misaligned — **when porting a mechanic like this again, copy the source's exact numeric constants first and only adjust deliberately afterward**, rather than eyeballing "close enough" values, since small drifts (a column width not matching where a connecting line is centered, a padding constant that's "close" but not exact) compound into looking broken rather than just slightly different.
  - **Mechanic**: each `.svc-journey-item` is a `grid-cols-[5rem_1fr]` row (an index number + text). A vertical spine (`::before` faint track, `::after` gold fill) draws downward via `transform: scaleY(var(--jline-progress))` as the viewport's vertical midpoint travels through the segment below that row's index number, and un-draws on scroll back up — driven continuously by a `scroll`-triggered, `requestAnimationFrame`-throttled `update()` in a `useEffect`, not a one-shot `IntersectionObserver` reveal. Text opacity/lift uses the same continuous-progress approach via `--jtext-opacity`, computed from a **fixed 90px scroll window** (`(midY - textStart + 40) / 90`) — this constant is what the reveal-per-item pace comes from, not item height, so if the reveal ever needs to feel slower/faster deliberately, widen/narrow this 90 rather than changing padding.
  - **Bottom fade**: a `position: sticky; bottom: 0` gradient (fading to `#0F0F12`, matching `bg-deep`) that reserves 3rem of scroll room so the last item can clear it before the page runs out of scroll — reduced from the original's `clamp(4.5rem,16vh,8rem)` (up to 128px) because the same absolute reserved space reads as a much more obvious empty void on our dark theme than it did on the original's light cream one. **Two real bugs hit while porting this, both worth knowing if this pattern is reused elsewhere**: (1) `position: sticky` inside an `overflow-hidden` ancestor resolves against *that ancestor's box*, not the true viewport — this section's own decorative blur-circle wrapper used to have `overflow-hidden` directly on the `<section>`, which silently broke the fade's stickiness (it just sat at a fixed spot instead of tracking scroll); fixed by moving `overflow-hidden` onto a dedicated absolutely-positioned wrapper *around only the decorative elements*, freeing the section itself. (2) the fade div must be sized to the section's *full* width, not just the padded content column — the section's ambient `.grid-bg` texture spans edge-to-edge including the side padding gutters, so a fade confined to the content column left an un-faded seam visible right at its edge. Fixed with `-mx-6` (undoing the mobile `px-6` padding) rather than a `w-screen`+`left-1/2`+`-translate-x-1/2` centering trick, which was tried first but resolves unpredictably (measured, didn't just theorize) on a `position: sticky` element specifically — percentage-based `left`/`transform` centering on sticky elements is not as reliable as it is on `absolute`/`fixed`, prefer a margin-based breakout when the padding being undone is a known fixed value.

## Known Gaps / Things a Future Session Should Know

- **No real contact form backend.** Needs something wired up (e.g. a Supabase table + insert, similar to the pattern used on other Aidid Marcello projects, or a simple email API) before this can go live as a functioning lead form.
- **No deployment configured.** No `netlify.toml`, no `vercel.json`, no CI — this project hasn't been deployed anywhere yet.
- **`git remote origin` now correctly points to `github.com/Sharpobot/sharpable-website`** (fixed from an earlier local-filesystem-path state) and this session's tool is authenticated to push directly — no longer a gap, kept here only so a future session doesn't waste time re-checking.
- **Privacy Policy content is aspirational, not accurate yet** — it states user data "is stored securely" and describes retention practices, but since the contact form doesn't actually store or send submissions anywhere yet, that copy will need revisiting once a real backend exists. Both legal pages are also generic placeholder text (dated "June 2026") that hasn't had legal review.
- `package-lock.json` shows as locally modified immediately after a fresh `npm install` in this environment — appears to be routine lockfile churn, safe to commit/ignore.
- **Horizontal-scroll/carousel container gotcha, hit once in `Testimonials.jsx`**: if a carousel's scrollable track sits in a *different* wrapping element than the section's heading/other content (e.g. heading in a `max-w-7xl mx-auto` div, track in a separate unconstrained `overflow-x-hidden` div), the track can silently render wider than the heading on large viewports even though nothing looks obviously wrong in code — the mismatch only shows up on wide desktop screens, easy to miss testing at typical widths. Fix: put the scrollable track inside the *exact same* `max-w-7xl mx-auto px-*` container as everything else in the section (see `Transformation.jsx`'s carousel and the current `Testimonials.jsx` for the correct pattern) rather than trying to give it its own independent width/margin math. **Also worth knowing**: verifying "is this actually clipped/overflowing" by checking a child element's `getBoundingClientRect()` is unreliable — `overflow:hidden` doesn't change a clipped child's reported bounding rect, it only affects what's painted. Check `document.documentElement.scrollWidth > window.innerWidth` (page-level overflow) instead, which reflects real clipping.
- **Three design-exploration Claude Artifacts exist from this project** (comparison galleries, not wired into the live site — proposals only): [Six Services, Five Ways](https://claude.ai/code/artifact/a9494666-0ebe-4148-8402-add0cc8f9f0f) (alternative ServicesGrid layouts — compact ledger, accordion, bento grid, horizontal filmstrip, detail switcher), [Four Ways to Open a Menu](https://claude.ai/code/artifact/79ef0b05-08ea-4b8d-8a8d-9f86af6adeb6) (live-tappable mobile menu animation concepts — full-screen editorial, right drawer, bottom sheet, circular reveal), [Eight Ways to Show Position](https://claude.ai/code/artifact/26c2a5ef-eeff-432e-8eec-43159a308b8b) (alternative dot/pagination indicator styles). The "journey" timeline pattern (ServicesGrid mobile) was picked from the first gallery and actually built; the other two are still just proposals as of this writing.
- **A reusable `design-exploration-gallery` skill was created** at the **user level** (`~/.claude/skills/design-exploration-gallery/SKILL.md`, not scoped to this repo — available across projects) to capture the process used to build the three galleries above: read the real current implementation first, pull the project's actual design tokens and real copy (never lorem ipsum), generate 3-5 genuinely distinct concepts and say so honestly when a candidate doesn't earn its place rather than padding the count, build every concept as live/interactive HTML (not static mockups), publish as a Claude Artifact rather than touching the codebase. Triggers on requests like "show me some alternative layouts/designs/animations for X" when the user wants to compare working options rather than get a single opinionated redesign.
- **The site's "proof" content is now a genuine mix of real and placeholder** — worth knowing precisely which is which before editing further: `Transformation`'s 3 cards and `Testimonials`' 2 cards are **real** (actual past client screenshots/quotes: Sizara Motorsports, Aidid Marcello, Tarbiah Sentap), while `Work`'s 2 cards ("Local Bakery Rebrand", "Boutique Fitness Studio") are still **fictional placeholders** with stock photography standing in for real screenshots. If real Work case studies ever get added, consider whether `Work` and `Transformation` end up telling redundant/conflicting stories on the same page.

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
