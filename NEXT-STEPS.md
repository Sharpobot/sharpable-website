# NEXT-STEPS.md

Short, current list of what is genuinely still open. `CLAUDE.md` is the source of truth for how
everything already built works — check it first; this file only tracks *unfinished* work. Keep it
short and delete items when they're done rather than marking them ✅ and letting it grow.

**Live site:** https://sharpable.netlify.app
**Netlify:** site id `f9edd46f-a88b-42ff-a710-f872c3b0363d`, team "Sharpable" (login `sharpablehq@gmail.com`)
**GitHub:** `Sharpobot/sharpable-website` (deploy procedure + auth gotcha: see CLAUDE.md → Known Gaps)

---

## Open items

### 1. Real domain swap (when a custom domain is bought/pointed)
The site uses `https://sharpable.netlify.app` everywhere. On switching, find-and-replace it in:
- `index.html` — canonical link, `og:url`, `og:image`/`twitter:image` (Cloudinary URLs there don't change), and the JSON-LD `url`
- `public/robots.txt` — the `Sitemap:` line
- `public/sitemap.xml` — all `<loc>` entries

Also add the domain in Netlify (Domain management), and add it to the Supabase Edge Function's
`ALLOWED_ORIGINS` secret and the Cloudflare Turnstile widget's hostname list — otherwise the contact
form will be rejected (CORS/origin check, Turnstile "domain not authorized") on the new domain.

### 2. Contact-form email: verify a real sending domain
Resend is in sandbox mode (`from: onboarding@resend.dev`, delivers only to `sharpablehq@gmail.com`).
Fine for now; a branded sender needs a verified domain in Resend (DNS records) — not a code change
beyond the `from` address in the Edge Function's `index.ts`.

### 3. Work section still uses fictional placeholder case studies
`Work.jsx` ("Local Bakery Rebrand", the fitness studio) are invented, with stock photos. Swap in real
projects when available (project names/blurbs in `translations.js`, photo URLs in the `IMAGES` array
at the top of `Work.jsx`). `Transformation`/`Testimonials` already hold real client proof, so once
Work is real the two may tell overlapping stories.

### 4. Protocol step images
The 3 process-card photos (`IMAGES` in `Protocol.jsx`) are generic Unsplash stock. Cosmetic, no rush.

### 5. Unrelated security issue in the shared Supabase project
`public.submissions` (a different app's table, in the same "Sharpable Business" project) has a
wide-open anonymous-insert policy. Deliberately left alone as out of scope; worth fixing if that app
is ever revisited.

### 6. Legal pages have never had a legal review
`/privacy` and `/terms` are generic placeholder text (dated "June 2026", English only) and describe
retention practices no code enforces (no auto-deletion). Get them reviewed before relying on them.

### 7. Optional polish, no urgency
- **Real PageSpeed run** against the deployed URL (pagespeed.web.dev). Only local CLI Lighthouse has
  been run, and that machine's numbers are noisy run-to-run.
- **Structured data extras** — `priceRange`/`image` (LocalBusiness) and `postalCode`/`streetAddress`
  (Organization) are optional suggestions from Google's Rich Results Test; skip the address if you
  don't want one public.
- **Share-card previews** — Facebook Sharing Debugger / LinkedIn Post Inspector need a login, so
  they have to be run by you.
- **More mobile performance** — only if a real complaint comes up; three ready-to-run options with
  their visual trade-offs are in `PERFORMANCE-TRADEOFFS.md`. Confirm which trade-off is acceptable
  before touching code.
- **Watch the hero shader / loading screen on real devices.** The scroll-freeze, context-loss and
  loading-stutter fixes were verified by reproduction and confirmed by the user in incognito on the
  live site, but real-world triggers (actual GPU resets, very slow networks that hit the 8s loader
  failsafe) can't be forced from the dev tooling. If either misbehaves again, read the `Hero` and
  `Loading screen` entries in CLAUDE.md first — the fixes and how they were tested are written up there.

---

## Already done (kept out of this list on purpose)
Contact form backend, OG image, apple-touch icon, self-hosted fonts, lazy-loading and the mobile
performance passes, the Archivo heading font, the site-wide corner-radius scale, and the
loading-screen / hero-shader fixes are all shipped and documented in `CLAUDE.md`.
