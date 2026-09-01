# NEXT-STEPS.md

Running list of everything discussed but not yet done, with enough detail that a fresh
session can pick any item up without re-litigating decisions already made. Update this
file as items get done or new ones come up — don't let it go stale.

**Live site:** https://sharpable.netlify.app
**Netlify:** site id `f9edd46f-a88b-42ff-a710-f872c3b0363d`, team "Sharpable" (login: `sharpablehq@gmail.com`)
**GitHub:** `Sharpobot/sharpable-website`

---

## 1. Performance pass (next up)

Three concrete sub-tasks, in the order they were raised:

**a) Responsive images.** The Unsplash/Cloudinary images already use `?auto=format&fit=crop&w=1200&q=80`
(decent format/quality), but every image ships the same 1200px-wide file to every device —
a phone downloads the same bytes as a 4K monitor. Fix: either add a `srcSet` with a couple of
narrower width tiers, or drop the default width for mobile via `sizes`. Files involved:
- `src/components/Work.jsx` — `IMAGES` array (2 Unsplash stock photos)
- `src/components/Protocol.jsx` — `IMAGES` array (3 Unsplash stock photos, the "how we work" cards)
- `src/components/Transformation.jsx` — `CARD_IMAGES` (11 Cloudinary URLs on the `da3lqh4dl` account,
  already has a `<picture>` mobile source — Cloudinary supports width params directly in the URL
  if tighter mobile sizing is wanted here too)
- `loading="lazy"` is already present on `WorkPreview.jsx` and `Protocol.jsx` images — that part's done.

**b) Font loading.** Fonts are loaded via Google Fonts `<link>` in `index.html` (not self-hosted).
Check: `preconnect` hints to `fonts.googleapis.com`/`fonts.gstatic.com`, `font-display: swap`
present, and whether self-hosting (via `@fontsource` or downloaded woff2 files) is worth the
build complexity for the payload savings.

**c) Code-splitting the legal pages.** `PrivacyPolicy.jsx` and `Terms.jsx` currently bundle into
the same main JS chunk as the homepage (last build: one 450KB `index-*.js`), even though almost
nobody visits them. Wrap their routes in `main.jsx` with `React.lazy()` + `<Suspense>` so that
code only downloads when someone actually navigates there.

**Baseline check:** tried running Google PageSpeed Insights against the live URL to get a before/after
number, but it got stuck mid-analysis in-session (never completed). Worth retrying manually at
https://pagespeed.web.dev/analysis?url=https://sharpable.netlify.app before/after this pass.

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
