# NEXT-STEPS.md

Running list of everything discussed but not yet done, with enough detail that a fresh
session can pick any item up without re-litigating decisions already made. Update this
file as items get done or new ones come up — don't let it go stale.

**Live site:** https://sharpable.netlify.app
**Netlify:** site id `f9edd46f-a88b-42ff-a710-f872c3b0363d`, team "Sharpable" (login: `sharpablehq@gmail.com`)
**GitHub:** `Sharpobot/sharpable-website`

---

## 1. Performance pass

**Passes 1–3 done** (see git log: "Performance pass 1/2/3" commits). What's left is optional
(Pass 4) and a real Lighthouse measurement (Pass 0, never actually run yet).

**Baseline before any of this** (real `npm run build`, pre-Pass-1): one JS chunk, 450KB/147KB
gzipped, CSS 42KB/8KB gzipped.

- ✅ **Pass 1 (load-time, zero visual risk)** — legal pages code-split via `React.lazy`/`Suspense`
  (now separate ~3.5KB chunks instead of bundled into main); `<link rel="preconnect">` added for
  `res.cloudinary.com`; Hero's WebGL rAF loop now pauses via `IntersectionObserver` once scrolled
  out of view; `loading="lazy"` confirmed on every image (only the testimonial avatar was missing
  it).
- ✅ **Pass 2 (payload size)** — Work/Protocol's Unsplash images now ship a `srcSet` with 400/800/1200w
  tiers instead of the same 1200px file to every device; every remaining Cloudinary image
  (Transformation's 12 case-study shots, Testimonials' avatar) now gets `c_limit,w_*,f_auto,q_auto`
  — a width cap sized to its real display size plus auto-compression.
- ✅ **Pass 3 (runtime/scroll smoothness, not just load time)** — a separate class of fix from 1–2,
  prompted by "smoother but still some friction, especially likely on phones" feedback. Three
  GPU-compositing costs that desktop GPUs absorb easily but phones feel much more, all now
  disabled/reduced **below the 1024px breakpoint only** (desktop untouched): the sitewide
  `mix-blend-mode` grain overlay (`.noise-overlay`, `index.css`) is hidden — it forces a full-page
  recomposite every scroll/animation frame; the navbar/mobile-menu `backdrop-filter` blur
  (`.glass`/`.glass-dark`, `index.css`) is halved 20px→10px; `Protocol.jsx`'s GSAP-scrubbed
  `filter: blur()/saturate()` on the stacking cards is dropped (kept: scale+opacity), since
  animating `filter` re-rasterizes on every scroll tick. Verified via `window.matchMedia` +
  reading GSAP's actual inline `filter` style at a real mobile viewport (375px), not just visual
  inspection — this tool's Browser pane can't reliably profile live frame timing (see CLAUDE.md's
  rAF/`document.hidden` gotcha), so if scroll smoothness ever needs re-checking, verify the same way
  (computed styles / matchMedia) rather than trusting `PerformanceObserver` numbers from in-pane.
- ✅ **Pass 3.5 — three more adjustments after Pass 3, same "phones struggle more" thread:**
  - Hero shader capped to 1x pixel density below 1024px (`HeroShaderBackground.jsx`) — a full-screen
    fragment shader's cost scales with pixel count, so allowing up to 2x on a retina phone roughly
    quadruples GPU work for a texture that's already soft/out-of-focus by design. Desktop unaffected.
  - `DesignShuffler`/`BuildScanner`/`StrategyScheduler` (the Features widgets) now pause their
    `setInterval` auto-cycle via a shared `useOnScreen()` hook once scrolled out of view — they used
    to run forever in the background, unlike the Hero shader which already had this. Zero visual
    change while visible.
  - Every section below `Hero` (`Features` through `Footer`) is now `React.lazy`-loaded behind
    `Suspense` — main JS chunk 447KB→378KB (130.6KB gzip). See the `App.jsx` entry in CLAUDE.md's
    High-Level Architecture section for why `Hero` specifically has to stay outside the Suspense
    boundary (it would otherwise wait on every lazy chunk too).

**Pass 0 — done, but only locally, and only via CLI.** `pagespeed.web.dev` in the Browser pane tool
failed twice across two sessions and was never actually completed that way — worked around by
installing `lighthouse` via `npx` and running it as a CLI against a local `vite preview` build
instead (`npx lighthouse http://localhost:PORT --preset=perf --form-factor=mobile
--screenEmulation.mobile --throttling-method=simulate --chrome-flags="--headless --no-sandbox"`).
**One Windows gotcha**: it always throws an `EPERM` cleaning up its own temp Chrome profile
afterward (same Controlled Folder Access class of issue as the documented Netlify deploy gotcha) —
harmless, the report JSON is already written by the time that error fires, just check the output
file exists rather than trusting the exit code. **Bigger caveat**: this dev machine's Lighthouse
numbers are noisy — two back-to-back runs of the exact same build swung Total Blocking Time
1237ms↔737ms and the Performance score 64↔73 with zero code changes between them. Trust large,
consistent, repeated-across-runs signals (a metric moving by 800ms+, or an audit item disappearing
entirely) from this path; don't trust small swings in one single run. **Still not done: a real run
against the actual deployed `sharpable.netlify.app` URL** via the real pagespeed.web.dev
infrastructure (not this machine) — that would be a cleaner, less noisy read if precise before/after
numbers are ever needed.

**If mobile performance is ever raised again after all of the above**, don't re-derive new ideas —
**`PERFORMANCE-TRADEOFFS.md`** (repo root) has three specific, ready-to-execute options already
scoped out (simplify the Hero shader's noise detail, cap it to 30fps, or drop Protocol's
sticky-stacking on mobile), each with exact file/line targets, expected gain, the real visual cost,
and how to verify it worked. Deliberately not applied yet — each trades away something visible, so
confirm with the user which trade-off (if any) they actually want before touching code.

- ✅ **Pass 4 — self-host fonts.** Turned out to matter more than expected: a real Lighthouse run
  flagged the Google Fonts `<link>` as the single biggest render-blocking cost on the page (778ms of
  the page's 1,800ms total render-blocking estimate, just for the round trip to fetch its CSS before
  any font file could even be requested) — `font-display: swap` avoids invisible text but doesn't
  avoid that round trip. Fixed by auditing every `font-*` weight class actually used in the codebase
  (Plus Jakarta Sans: only 600/700/800; Cormorant Garamond: only *italic* 400/500 — matches
  CLAUDE.md's own note it's always used italic, so every upright variant was dead weight; Inter: only
  400/500/600; JetBrains Mono: only 400, never has a weight override anywhere) and switching to
  `@fontsource`'s `latin-*` subset files (skips bundling cyrillic/greek/vietnamese `@font-face`
  declarations this English/Bahasa-Melayu site never needs) imported directly in `main.jsx`. Real
  result: FCP 3.5s→2.7s, LCP 4.1s→3.2s, and the Google Fonts entry is gone from the render-blocking
  list entirely.

---

## 2. Contact form → real backend (Supabase) + bot protection

`src/components/ContactForm.jsx` is currently 100% UI-only — `handleSubmit` (line 14) just does
`setTimeout(() => setStatus('sent'), 1200)` and throws the data away. Nothing is stored or sent
anywhere. The plan discussed, layered specifically because a public form on a live, indexed site
is a spam magnet the moment Google finds it:

1. **Hidden honeypot field** — an input real users never see or fill in (e.g. `position: absolute;
   left: -9999px` or a field with no visible label). Bots that auto-fill every field on a page trip
   it. If it has any value on submit, silently drop the request (pretend success, log nothing).
2. **Cloudflare Turnstile** — a low-friction "prove you're human" widget (like reCAPTCHA but usually
   invisible, only occasionally showing a real challenge). Needs a free Cloudflare account + site key.
3. **Supabase Edge Function as the only write path** — the client never inserts directly into a
   Supabase table with the public anon key (that would let anyone who reads the bundle write
   directly to the DB, honeypot or not, by just calling the REST API themselves). Instead:
   client → POST to an Edge Function → function validates the Turnstile token server-side, checks
   the honeypot, applies basic rate-limiting (e.g. by IP or a short-lived token), then inserts using
   a service-role key. This is the part that actually closes the "anyone can write directly to my
   database" hole that just RLS + honeypot alone wouldn't.

Open decisions for whoever picks this up: which Supabase project (new vs. reuse one from another
Aidid Marcello project — CLAUDE.md mentions this pattern's been used elsewhere), and whether email
notifications on new submissions are wanted (e.g. via Resend/Postmark from inside the same Edge
Function) or a dashboard-only view is enough for now.

---

## 3. OG image — waiting on your design

You're designing the actual `og-image.jpg` yourself. Background reference stills were generated
from the live hero shader (plain animated flow-noise, no glow, no UI) to use as a backdrop —
**these live in a session-scoped scratchpad temp folder and do NOT persist across sessions.**
If you want to keep using them, save them somewhere permanent (a project `assets/` folder, your
Desktop, etc.) rather than relying on them still being there next time.

Once the final image is ready: it needs to land at `public/og-image.jpg` (1200×630 is the standard
OG image size). No code changes needed — `index.html`'s `og:image` and `twitter:image` tags already
point at that exact path.

**Known bug until then:** because the file doesn't exist yet, requesting `/og-image.jpg` on the live
site currently returns HTTP 200 with HTML (it falls through to the SPA catch-all redirect in
`public/_redirects`) instead of a real 404. Practical effect: **link previews on Facebook/Twitter/
LinkedIn currently show no image at all** when the site is shared. Resolves itself automatically
the moment the real file is added and deployed.

---

## 4. Process card images (`Protocol.jsx`)

The 3 "how we work" step images are still generic Unsplash stock photos (see `IMAGES` array,
`src/components/Protocol.jsx` lines 5-8). Swap for something more specific to the actual process
whenever convenient — purely cosmetic, no rush, no dependencies on anything else.

---

## 5. Real domain swap (once you buy/point one)

The site currently uses `https://sharpable.netlify.app` everywhere (already migrated once from an
earlier `sharpable.com` placeholder). Once a real custom domain exists and is pointed at Netlify,
find-and-replace the live URL across:
- `index.html` — canonical link, `og:url`, `og:image`, `twitter:image`, and the JSON-LD `url` field
- `public/robots.txt` — the `Sitemap:` line
- `public/sitemap.xml` — all `<loc>` entries

Also worth pointing the actual domain at the Netlify site in the Netlify dashboard (Domain
management) at the same time, obviously.

---

## 6. Minor loose ends (no urgency, just don't forget)

- **Apple touch icon (180×180)** — attempted twice this project, failed both times on a base64
  transcription snag while generating it manually. Not currently in `index.html`. Low priority,
  revisit with a cleaner generation method (e.g. an actual image tool rather than hand-transcribed
  base64) if/when it matters.
- **`.claude/launch.json`** is untracked in git (defines the dev-server launch config for the
  Browser-pane tool). Harmless either way — commit it if you want it version-controlled, ignore it
  if not.
- **Netlify deploy EPERM gotcha** — deploying directly from the project folder can fail with
  `EPERM: access denied` on `.netlify\v1\functions`, almost certainly Windows Defender's Controlled
  Folder Access (or similar) locking that specific path — not a code issue. **Workaround that
  worked:** copy the built `dist/` folder to a clean location outside the project (e.g. a scratch
  temp dir), then run `netlify deploy --prod --no-build --dir=. --site=f9edd46f-a88b-42ff-a710-f872c3b0363d`
  from inside that clean copy. If this recurs, that's the fix — or disable Controlled Folder Access
  for the project folder in Windows Security if it becomes a recurring annoyance.
- **Structured data optional fields** — Google's Rich Results Test (run against the live URL,
  real crawl) validated the JSON-LD successfully with only optional-field suggestions: `priceRange`
  and `image` (LocalBusiness view), `postalCode`/`streetAddress` (Organization view — skippable if
  you don't want a public street address listed). None of these block anything; add only if desired.
- **`Work.jsx` still has fictional case studies** — "Local Bakery Rebrand" and the fitness-studio
  project are invented placeholders with stock photos standing in for real screenshots, unlike
  `Transformation.jsx`/`Testimonials.jsx` which already carry genuine past-client proof (Sizara
  Motorsports, Aidid Marcello, Tarbiah Sentap). Swap in real case studies when available — and note
  `Work` and `Transformation` may end up telling overlapping stories once both are real.
- **Facebook Sharing Debugger / LinkedIn Post Inspector** both now require signing in to use —
  couldn't be run from here without entering credentials. If you want to actually preview the
  share-card appearance on those platforms, run them yourself while logged into your own accounts:
  - https://developers.facebook.com/tools/debug/
  - https://www.linkedin.com/post-inspector/
