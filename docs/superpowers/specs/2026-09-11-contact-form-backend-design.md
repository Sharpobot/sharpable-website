# Contact Form Backend — Design Spec

**Date:** 2026-09-11
**Status:** Approved by user, pending implementation plan

## Goal

Replace `ContactForm.jsx`'s current UI-only stub (`handleSubmit` fakes a 1200ms delay then discards the data) with a real, professionally-secured backend: submissions are validated, spam/bot-resistant, stored, and emailed to `sharpablehq@gmail.com` — with the database itself locked down so it cannot be written to except through the one sanctioned path, even by someone reading the site's own public source code.

## Confirmed environment

- **Supabase project:** "Sharpable Business" (ref `cztatucsaltujvpdwvyd`, region `ap-southeast-1`, URL `https://cztatucsaltujvpdwvyd.supabase.co`). This is a **shared** project — it already hosts unrelated tables for other apps (`quiz_results`, `linkinbio_requests`, and a pre-existing `submissions` table belonging to a different app). Our new table is named `contact_submissions` specifically to avoid colliding with the existing `submissions` table.
- **Note (out of scope, flagged for awareness):** the existing `public.submissions` table currently has a policy granting anonymous `INSERT` with no restriction (`with_check: true`). Not touched by this work — belongs to a different app — but worth the user's attention separately.
- **No Edge Functions deployed yet** — clean slate.
- **Cloudflare Turnstile:** widget created for `sharpable.netlify.app`, Managed mode. Site key: `0x4AAAAAAEv5fTCkboTJS2Ud`. Secret key held by the user, to be set as a Supabase Edge Function secret (never enters this codebase or chat).
- **Resend:** account created under `sharpablehq@gmail.com`, API key generated. Running in sandbox mode (no verified sending domain yet), which delivers only to the account-owner email — which is exactly the target address, so this is sufficient for now. API key to be set as a Supabase Edge Function secret.
- **Approved defaults:** rate limit 5 submissions/hour per IP; file uploads capped at 5MB each, max 5 files, stored in Supabase Storage.

## Architecture / data flow

```
Browser (ContactForm.jsx)
  → Turnstile widget runs invisibly, produces a token
  → honeypot field present but hidden (CSS), empty for real users
  → on submit: POST to Supabase Edge Function `submit-contact-form`
      with { name, email, phone, company, message, files[], turnstileToken, honeypotField }

Edge Function `submit-contact-form` (Deno, runs with service-role privileges):
  1. CORS check — reject if Origin isn't an allowed domain
  2. Honeypot check — if filled, return fake-success (200) and do nothing else
  3. Turnstile verification — POST the token to Cloudflare's siteverify API server-side;
     reject if invalid, expired, or already used (Cloudflare enforces single-use)
  4. Rate-limit check — count contact_submissions rows from this IP in the last hour;
     reject with 429 if >= 5
  5. Field validation/sanitization — required fields present, email format check,
     per-field length caps, message length cap
  6. File validation (if any) — real content-type sniff (magic bytes, not filename),
     reject non-images, enforce 5MB/file and 5-file hard caps server-side
  7. Upload valid files to a private Storage bucket (`contact-attachments`)
  8. Insert the row into `contact_submissions` (service role — bypasses RLS by design,
     this is the only path capable of doing so)
  9. Generate short-lived signed URLs (24h) for any uploaded files
  10. Send notification email via Resend to sharpablehq@gmail.com, including the
      message and signed image links
  11. Return success to the browser
```

## Database: `contact_submissions`

| column | type | notes |
|---|---|---|
| `id` | `bigint` (identity) | primary key |
| `created_at` | `timestamptz` | default `now()` |
| `name` | `text` | required, capped 200 chars |
| `email` | `text` | required, format-checked |
| `phone` | `text` | optional, capped 40 chars |
| `company` | `text` | optional, capped 200 chars |
| `message` | `text` | required, capped 5,000 chars |
| `attachment_paths` | `text[]` | Storage object paths, not public URLs |
| `ip_address` | `text` | used only for rate-limit lookups |
| `status` | `text` | default `'new'` (room for a future `'read'`/`'replied'` if a dashboard is ever built) |

**RLS:** enabled, **zero policies** for `anon` or `authenticated`. No SELECT, no INSERT, nothing. This is the core guarantee: the public key shipped in the site's JS bundle cannot touch this table at all, at the database level, regardless of what a visitor's browser is made to do. The Edge Function's service-role key is the only credential that can write, and it lives exclusively as a Supabase Edge Function secret — never in the repo, never in the browser.

## Storage: `contact-attachments` bucket

- **Private** (not in the public bucket list) — files aren't reachable by guessing a URL.
- No public policies. Only the service-role key (inside the Edge Function) can write.
- Viewing an attachment happens via the signed URL emailed to `sharpablehq@gmail.com` (expires in 24h) — not a permanent public link.

## Edge Function security details (the "no bypass" checklist)

- **CORS allow-list**: only `https://sharpable.netlify.app` (plus `http://localhost:5173` for local dev testing) — the endpoint refuses requests from any other Origin, so it can't be copy-pasted into an unrelated page.
- **Turnstile verified server-side, every time** — the browser's claim of "I passed the check" is never trusted; the function re-checks with Cloudflare directly, and Cloudflare rejects a reused token automatically.
- **Honeypot checked server-side**, independent of the browser-side hiding — covers someone bypassing the UI and POSTing directly.
- **Rate limiting** enforced in the function itself (a `SELECT count(*) ... WHERE ip_address = $1 AND created_at > now() - interval '1 hour'` against `contact_submissions`, using the service-role connection — no extra service needed).
- **Input validation** server-side regardless of what the client already validates, since a direct API/script call skips the browser entirely.
- **File content sniffing** — validates actual bytes, not the filename extension, before accepting an "image."

## Frontend changes (`ContactForm.jsx` + new pieces)

- Add the Turnstile widget (`react-turnstile` or the vanilla script — decide in the implementation plan) rendered invisibly in the form, site key from a Vite env var (`VITE_TURNSTILE_SITE_KEY`, safe to commit since it's public).
- Add a hidden honeypot field (a real `<input>`, visually hidden via CSS — not `display:none`/`type=hidden`, which bots increasingly skip; an off-screen-positioned text input is more effective).
- Replace the fake `setTimeout` in `handleSubmit` with a real `fetch()` to the Edge Function URL, sending form fields + files (as `FormData`, since files are binary) + the Turnstile token.
- Map real response states: `sending` → `sent` (existing UI) on success; a new inline error message for validation failures (400) or rate-limiting (429, friendly "please wait before submitting again"); keep the existing UI shell, no redesign needed.

## Error handling summary

| condition | response |
|---|---|
| honeypot filled | fake `200 success`, nothing stored, nothing sent |
| Turnstile invalid/missing | `400`, generic "verification failed, please try again" |
| rate limit exceeded | `429`, "please wait before sending another message" |
| missing/invalid required fields | `400`, specific field-level message |
| file too large / wrong type / too many | `400`, specific message |
| unexpected server error | `500`, generic message shown to user; details logged server-side only |

## Explicitly out of scope

- No admin dashboard UI — viewing submissions happens via Supabase Studio directly (table view) for now.
- No reply/threading feature.
- Fixing the unrelated `public.submissions` table's open policy (flagged separately, not part of this work).
- Custom-domain email sending via Resend (requires DNS verification once a domain exists — sandbox mode is sufficient today).

## What still needs deciding in the implementation plan

- Exact Turnstile client library choice for React 19.
- Exact honeypot field styling approach (off-screen vs. other techniques) consistent with existing Tailwind patterns in the file.
- Whether `ip_address` is read from a Supabase-provided header (`x-forwarded-for` equivalent) inside the Edge Function — needs confirming which header Supabase's Edge Runtime actually populates.
