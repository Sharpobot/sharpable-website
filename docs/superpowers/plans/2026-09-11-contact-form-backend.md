# Contact Form Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `ContactForm.jsx`'s fake `setTimeout` stub with a real, professionally-secured submission pipeline: Cloudflare Turnstile + a server-checked honeypot + a Supabase Edge Function that is the *only* thing capable of writing to a locked-down `contact_submissions` table, with file attachments in a private Storage bucket and an email notification via Resend.

**Architecture:** Browser → Cloudflare Turnstile (bot check) → Supabase Edge Function `submit-contact-form` (Deno, runs with the service-role key) → validates everything server-side regardless of what the browser already checked → writes to Postgres (RLS on, zero public policies) and Storage (private bucket) → emails `sharpablehq@gmail.com` via Resend. The public anon key shipped in the site's JS bundle has zero table permissions — only the Edge Function's service-role secret can write.

**Tech Stack:** Supabase (Postgres + Storage + Edge Functions/Deno), Cloudflare Turnstile, Resend, React 19 + `@marsidev/react-turnstile`, Deno's built-in test runner for the backend logic.

## Global Constraints

- Supabase project: **"Sharpable Business"**, ref `cztatucsaltujvpdwvyd`, URL `https://cztatucsaltujvpdwvyd.supabase.co` — a shared project with unrelated tables (`quiz_results`, `linkinbio_requests`, and an unrelated pre-existing `submissions` table). Never touch those.
- New table is named `contact_submissions` (not `submissions` — that name is already taken by a different app).
- RLS must be enabled on `contact_submissions` with **zero** policies for `anon`/`authenticated` roles. Only the service-role key (used exclusively inside the Edge Function) may read/write.
- Storage bucket `contact-attachments` must be **private** (`public: false`), no policies for `anon`/`authenticated`.
- Rate limit: **5 submissions per hour per IP** (approved default).
- File limits: **5MB per file, 5 files max**, validated server-side by real file-content sniffing (magic bytes), never by filename/extension alone.
- CORS/origin allow-list: `https://sharpable.netlify.app` and `http://localhost:5173`. A request with a missing or non-matching `Origin` header must be rejected with `403` — not just given permissive CORS response headers (CORS headers alone don't stop a non-browser client from calling the endpoint directly).
- Turnstile site key (public, safe to commit): `0x4AAAAAAEv5fTCkboTJS2Ud`.
- Notification recipient: `sharpablehq@gmail.com`.
- Resend is in sandbox mode (no verified domain yet) — outgoing mail must be sent `from: 'onboarding@resend.dev'`, which is the only sender sandbox mode allows, and it only delivers to the Resend account's own registered address (`sharpablehq@gmail.com`), which is exactly the target.
- Secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `ALLOWED_ORIGINS`) are set by the user directly in the Supabase dashboard. Never request them in chat, never commit them.
- **Do not deploy to Netlify** as part of this work — the user explicitly deferred pushing live changes. Stop after local + live-Supabase verification.

---

## File Structure

```
supabase/
  migrations/
    20260911120000_contact_submissions.sql   [new] table + RLS + storage bucket
  functions/
    submit-contact-form/
      validation.ts        [new] pure validation/sniffing logic (unit tested)
      validation.test.ts   [new]
      handler.ts            [new] orchestration logic, dependency-injected (unit tested with fakes)
      handler.test.ts      [new]
      index.ts               [new] real Deno.serve entrypoint — wires real I/O into handler.ts

src/
  contactFormApi.js        [new] fetch() wrapper the component calls
  components/
    ContactForm.jsx        [modify] real submit flow, honeypot field, Turnstile widget
  translations.js           [modify] add contact.errors.* copy (en + ms)

.env.example                [new] documents VITE_TURNSTILE_SITE_KEY / VITE_SUPABASE_ANON_KEY
.env.local                  [new, gitignored via existing *.local rule] real values
```

---

### Task 1: Database table + Storage bucket, locked down

**Files:**
- Create: `supabase/migrations/20260911120000_contact_submissions.sql`

**Interfaces:**
- Produces: table `public.contact_submissions` (columns: `id`, `created_at`, `name`, `email`, `phone`, `company`, `message`, `attachment_paths text[]`, `ip_address`, `status`) and Storage bucket `contact-attachments` (private), both consumed by the Edge Function in Task 4.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260911120000_contact_submissions.sql`:

```sql
create table if not exists public.contact_submissions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  company text,
  message text not null,
  attachment_paths text[] not null default '{}',
  ip_address text,
  status text not null default 'new',
  constraint contact_submissions_name_length check (char_length(name) <= 200),
  constraint contact_submissions_email_length check (char_length(email) <= 320),
  constraint contact_submissions_phone_length check (phone is null or char_length(phone) <= 40),
  constraint contact_submissions_company_length check (company is null or char_length(company) <= 200),
  constraint contact_submissions_message_length check (char_length(message) <= 5000)
);

create index if not exists contact_submissions_ip_created_at_idx
  on public.contact_submissions (ip_address, created_at desc);

-- RLS on, deliberately zero policies for anon/authenticated. Only the
-- service-role key (used exclusively inside the Edge Function) bypasses
-- RLS by design in Postgres/Supabase, so it's the only way in.
alter table public.contact_submissions enable row level security;

-- Defense in depth: also revoke the table-level grants Supabase's default
-- schema privileges hand out to anon/authenticated, on top of RLS.
revoke all on public.contact_submissions from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('contact-attachments', 'contact-attachments', false)
on conflict (id) do nothing;

-- No storage.objects policies added for this bucket — Supabase's storage
-- RLS defaults to deny, so anon/authenticated get zero access by default.
```

- [ ] **Step 2: Apply the migration to the live "Sharpable Business" project**

Call the Supabase `apply_migration` tool with `project_id: "cztatucsaltujvpdwvyd"`, `name: "create_contact_submissions"`, and `query` set to the exact SQL from Step 1.

- [ ] **Step 3: Verify RLS is genuinely locked — no policies exist**

Call `execute_sql` with `project_id: "cztatucsaltujvpdwvyd"`:

```sql
select policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'contact_submissions';
```

Expected: an empty result set (`[]`). If any row comes back, something granted public access — stop and investigate before continuing.

- [ ] **Step 4: Verify the bucket is private**

```sql
select id, public from storage.buckets where id = 'contact-attachments';
```

Expected: one row, `public: false`.

- [ ] **Step 5: Live-test that the public key genuinely cannot write (the real "no bypass" proof)**

Run this in PowerShell — it simulates exactly what an attacker reading the site's public JS bundle could try:

```powershell
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dGF0dWNzYWx0dWp2cGR3dnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTcyMDAsImV4cCI6MjA3NjE5MzIwMH0.pGylZ7WkR4oWZIavR0VvcVp78YHkx8gNyOLuR7I8h8s"
try {
  Invoke-RestMethod -Method Post `
    -Uri "https://cztatucsaltujvpdwvyd.supabase.co/rest/v1/contact_submissions" `
    -Headers @{ apikey = $anonKey; Authorization = "Bearer $anonKey"; "Content-Type" = "application/json" } `
    -Body '{"name":"attacker test","email":"a@b.com","message":"should be rejected"}'
  Write-Host "UNEXPECTED: insert succeeded"
} catch {
  Write-Host "Expected rejection:" $_.Exception.Response.StatusCode
}
```

Expected: an error (401 or 403-class response), **not** a successful insert. This is the concrete proof the table can't be bypassed by anyone reading the site's public key.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260911120000_contact_submissions.sql
git commit -m "Add locked-down contact_submissions table and private Storage bucket

RLS enabled with zero anon/authenticated policies -- only the Edge
Function's service-role key can write. Verified live that the public
anon key is rejected on a direct insert attempt."
```

---

### Task 2: Edge Function — pure validation logic (TDD)

**Files:**
- Create: `supabase/functions/submit-contact-form/validation.ts`
- Test: `supabase/functions/submit-contact-form/validation.test.ts`

**Interfaces:**
- Produces: `ContactFormFields`, `ValidationError`, `isHoneypotTripped(honeypot: string): boolean`, `validateFields(fields: ContactFormFields): ValidationError[]`, `sniffImageType(bytes: Uint8Array): string | null`, `validateFiles(files: {name, size, bytes}[]): FileValidationError[]`, `isRateLimited(count: number): boolean`, `RATE_LIMIT_MAX_PER_HOUR`. Consumed by `handler.ts` in Task 3.

- [ ] **Step 1: Install Deno (one-time machine setup)**

```powershell
irm https://deno.land/install.ps1 | iex
```

Close and reopen the terminal, then confirm:

```bash
deno --version
```

Expected: version output (no "not found" error).

- [ ] **Step 2: Write the failing tests**

Create `supabase/functions/submit-contact-form/validation.test.ts`:

```ts
import { assertEquals } from 'jsr:@std/assert@1'
import {
  isHoneypotTripped,
  validateFields,
  sniffImageType,
  validateFiles,
  isRateLimited,
  RATE_LIMIT_MAX_PER_HOUR,
} from './validation.ts'

Deno.test('isHoneypotTripped - empty honeypot is not tripped', () => {
  assertEquals(isHoneypotTripped(''), false)
})

Deno.test('isHoneypotTripped - whitespace-only honeypot is not tripped', () => {
  assertEquals(isHoneypotTripped('   '), false)
})

Deno.test('isHoneypotTripped - filled honeypot is tripped', () => {
  assertEquals(isHoneypotTripped('http://spam.example'), true)
})

Deno.test('validateFields - valid submission has no errors', () => {
  const errors = validateFields({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '',
    company: '',
    message: 'Hello, I would like a website.',
    honeypot: '',
  })
  assertEquals(errors, [])
})

Deno.test('validateFields - missing name is rejected', () => {
  const errors = validateFields({
    name: '',
    email: 'jane@example.com',
    phone: '',
    company: '',
    message: 'Hello',
    honeypot: '',
  })
  assertEquals(errors.some((e) => e.field === 'name'), true)
})

Deno.test('validateFields - malformed email is rejected', () => {
  const errors = validateFields({
    name: 'Jane',
    email: 'not-an-email',
    phone: '',
    company: '',
    message: 'Hello',
    honeypot: '',
  })
  assertEquals(errors.some((e) => e.field === 'email'), true)
})

Deno.test('validateFields - message over 5000 chars is rejected', () => {
  const errors = validateFields({
    name: 'Jane',
    email: 'jane@example.com',
    phone: '',
    company: '',
    message: 'a'.repeat(5001),
    honeypot: '',
  })
  assertEquals(errors.some((e) => e.field === 'message'), true)
})

Deno.test('sniffImageType - detects a real PNG by magic bytes', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0])
  assertEquals(sniffImageType(pngBytes), 'image/png')
})

Deno.test('sniffImageType - detects a real JPEG by magic bytes', () => {
  const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])
  assertEquals(sniffImageType(jpegBytes), 'image/jpeg')
})

Deno.test('sniffImageType - rejects non-image bytes even with an image-like name', () => {
  const fakeBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // "%PDF"
  assertEquals(sniffImageType(fakeBytes), null)
})

Deno.test('validateFiles - rejects more than 5 files', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const files = Array.from({ length: 6 }, (_, i) => ({ name: `f${i}.png`, size: 100, bytes: pngBytes }))
  const errors = validateFiles(files)
  assertEquals(errors.length > 0, true)
})

Deno.test('validateFiles - rejects a file over 5MB', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const files = [{ name: 'big.png', size: 6 * 1024 * 1024, bytes: pngBytes }]
  const errors = validateFiles(files)
  assertEquals(errors.some((e) => e.message.includes('too large')), true)
})

Deno.test('validateFiles - rejects a non-image disguised with an image extension', () => {
  const fakeBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
  const files = [{ name: 'not-really.png', size: 100, bytes: fakeBytes }]
  const errors = validateFiles(files)
  assertEquals(errors.some((e) => e.message.includes('not a supported image')), true)
})

Deno.test('validateFiles - accepts a valid small PNG', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const files = [{ name: 'logo.png', size: 100, bytes: pngBytes }]
  const errors = validateFiles(files)
  assertEquals(errors, [])
})

Deno.test('isRateLimited - under the threshold is not limited', () => {
  assertEquals(isRateLimited(RATE_LIMIT_MAX_PER_HOUR - 1), false)
})

Deno.test('isRateLimited - at the threshold is limited', () => {
  assertEquals(isRateLimited(RATE_LIMIT_MAX_PER_HOUR), true)
})
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
deno test supabase/functions/submit-contact-form/validation.test.ts
```

Expected: FAIL — `validation.ts` doesn't exist yet ("Module not found" error).

- [ ] **Step 4: Write the implementation**

Create `supabase/functions/submit-contact-form/validation.ts`:

```ts
export interface ContactFormFields {
  name: string
  email: string
  phone?: string
  company?: string
  message: string
  honeypot: string
}

export interface ValidationError {
  field: string
  message: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isHoneypotTripped(honeypot: string): boolean {
  return honeypot.trim().length > 0
}

export function validateFields(fields: ContactFormFields): ValidationError[] {
  const errors: ValidationError[] = []

  if (!fields.name || fields.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required.' })
  } else if (fields.name.length > 200) {
    errors.push({ field: 'name', message: 'Name is too long.' })
  }

  if (!fields.email || fields.email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required.' })
  } else if (fields.email.length > 320) {
    errors.push({ field: 'email', message: 'Email is too long.' })
  } else if (!EMAIL_RE.test(fields.email)) {
    errors.push({ field: 'email', message: 'Email address looks invalid.' })
  }

  if (fields.phone && fields.phone.length > 40) {
    errors.push({ field: 'phone', message: 'Phone number is too long.' })
  }

  if (fields.company && fields.company.length > 200) {
    errors.push({ field: 'company', message: 'Company name is too long.' })
  }

  if (!fields.message || fields.message.trim().length === 0) {
    errors.push({ field: 'message', message: 'Message is required.' })
  } else if (fields.message.length > 5000) {
    errors.push({ field: 'message', message: 'Message is too long (max 5000 characters).' })
  }

  return errors
}

interface FileLike {
  name: string
  size: number
  bytes: Uint8Array
}

export interface FileValidationError {
  fileName: string
  message: string
}

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_FILES = 5

function bytesStartWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false
  }
  return true
}

export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (bytesStartWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'image/gif'
  if (
    bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

export function validateFiles(files: FileLike[]): FileValidationError[] {
  const errors: FileValidationError[] = []

  if (files.length > MAX_FILES) {
    errors.push({ fileName: '', message: `Too many files — max ${MAX_FILES} allowed.` })
    return errors
  }

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      errors.push({ fileName: file.name, message: 'File is too large (max 5MB).' })
      continue
    }
    if (!sniffImageType(file.bytes)) {
      errors.push({ fileName: file.name, message: 'File is not a supported image type.' })
    }
  }

  return errors
}

export const RATE_LIMIT_MAX_PER_HOUR = 5

export function isRateLimited(recentSubmissionCount: number): boolean {
  return recentSubmissionCount >= RATE_LIMIT_MAX_PER_HOUR
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
deno test supabase/functions/submit-contact-form/validation.test.ts
```

Expected: all tests PASS (17 tests, 0 failures).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/submit-contact-form/validation.ts supabase/functions/submit-contact-form/validation.test.ts
git commit -m "Add pure validation/sniffing logic for the contact form Edge Function, with tests"
```

---

### Task 3: Edge Function — orchestration handler (TDD with fakes)

**Files:**
- Create: `supabase/functions/submit-contact-form/handler.ts`
- Test: `supabase/functions/submit-contact-form/handler.test.ts`

**Interfaces:**
- Consumes: everything from `validation.ts` (Task 2).
- Produces: `IncomingFile`, `SubmitRequest`, `Deps`, `HandlerResult`, `handleSubmission(req: SubmitRequest, deps: Deps): Promise<HandlerResult>`. Consumed by `index.ts` in Task 4.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/submit-contact-form/handler.test.ts`:

```ts
import { assertEquals } from 'jsr:@std/assert@1'
import { handleSubmission, Deps, SubmitRequest } from './handler.ts'

function makeDeps(overrides: Partial<Deps> = {}): { deps: Deps; calls: Record<string, number> } {
  const calls: Record<string, number> = {}
  const deps: Deps = {
    verifyTurnstile: async () => {
      calls.verifyTurnstile = (calls.verifyTurnstile ?? 0) + 1
      return true
    },
    countRecentSubmissions: async () => {
      calls.countRecentSubmissions = (calls.countRecentSubmissions ?? 0) + 1
      return 0
    },
    uploadFile: async () => {
      calls.uploadFile = (calls.uploadFile ?? 0) + 1
    },
    insertSubmission: async () => {
      calls.insertSubmission = (calls.insertSubmission ?? 0) + 1
    },
    createSignedUrls: async (paths: string[]) => {
      calls.createSignedUrls = (calls.createSignedUrls ?? 0) + 1
      return paths.map((p) => `https://signed.example/${p}`)
    },
    sendNotificationEmail: async () => {
      calls.sendNotificationEmail = (calls.sendNotificationEmail ?? 0) + 1
    },
    ...overrides,
  }
  return { deps, calls }
}

function baseRequest(overrides: Partial<SubmitRequest> = {}): SubmitRequest {
  return {
    fields: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '',
      company: '',
      message: 'Hello, I need a website.',
      honeypot: '',
    },
    files: [],
    turnstileToken: 'test-token',
    ip: '203.0.113.5',
    ...overrides,
  }
}

Deno.test('handleSubmission - honeypot tripped returns fake success without calling any deps', async () => {
  const { deps, calls } = makeDeps()
  const req = baseRequest({ fields: { ...baseRequest().fields, honeypot: 'im-a-bot' } })
  const result = await handleSubmission(req, deps)
  assertEquals(result.status, 200)
  assertEquals(result.body.ok, true)
  assertEquals(calls.verifyTurnstile, undefined)
  assertEquals(calls.insertSubmission, undefined)
})

Deno.test('handleSubmission - invalid fields return 400 without calling any deps', async () => {
  const { deps, calls } = makeDeps()
  const req = baseRequest({ fields: { ...baseRequest().fields, email: 'not-an-email' } })
  const result = await handleSubmission(req, deps)
  assertEquals(result.status, 400)
  assertEquals(result.body.ok, false)
  assertEquals(calls.verifyTurnstile, undefined)
})

Deno.test('handleSubmission - invalid file returns 400 and skips turnstile', async () => {
  const { deps, calls } = makeDeps()
  const fakeBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
  const req = baseRequest({ files: [{ name: 'not-image.png', size: 4, bytes: fakeBytes }] })
  const result = await handleSubmission(req, deps)
  assertEquals(result.status, 400)
  assertEquals(calls.verifyTurnstile, undefined)
})

Deno.test('handleSubmission - rate limited returns 429 and skips turnstile+insert', async () => {
  const { deps, calls } = makeDeps({ countRecentSubmissions: async () => 5 })
  const result = await handleSubmission(baseRequest(), deps)
  assertEquals(result.status, 429)
  assertEquals(calls.verifyTurnstile, undefined)
  assertEquals(calls.insertSubmission, undefined)
})

Deno.test('handleSubmission - failed turnstile returns 400 and skips insert', async () => {
  const { deps, calls } = makeDeps({ verifyTurnstile: async () => false })
  const result = await handleSubmission(baseRequest(), deps)
  assertEquals(result.status, 400)
  assertEquals(calls.insertSubmission, undefined)
})

Deno.test('handleSubmission - happy path with no files inserts and emails, skips storage calls', async () => {
  const { deps, calls } = makeDeps()
  const result = await handleSubmission(baseRequest(), deps)
  assertEquals(result.status, 200)
  assertEquals(result.body.ok, true)
  assertEquals(calls.insertSubmission, 1)
  assertEquals(calls.sendNotificationEmail, 1)
  assertEquals(calls.uploadFile, undefined)
  assertEquals(calls.createSignedUrls, undefined)
})

Deno.test('handleSubmission - happy path with a file uploads it and requests a signed url', async () => {
  const { deps, calls } = makeDeps()
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const req = baseRequest({ files: [{ name: 'logo.png', size: 8, bytes: pngBytes }] })
  const result = await handleSubmission(req, deps)
  assertEquals(result.status, 200)
  assertEquals(calls.uploadFile, 1)
  assertEquals(calls.createSignedUrls, 1)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
deno test supabase/functions/submit-contact-form/handler.test.ts
```

Expected: FAIL — `handler.ts` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `supabase/functions/submit-contact-form/handler.ts`:

```ts
import { validateFields, isHoneypotTripped, validateFiles, isRateLimited, ContactFormFields } from './validation.ts'

export interface IncomingFile {
  name: string
  size: number
  bytes: Uint8Array
}

export interface SubmitRequest {
  fields: ContactFormFields
  files: IncomingFile[]
  turnstileToken: string
  ip: string
}

export interface InsertRow {
  name: string
  email: string
  phone: string | null
  company: string | null
  message: string
  attachment_paths: string[]
  ip_address: string
}

export interface Deps {
  verifyTurnstile: (token: string, ip: string) => Promise<boolean>
  countRecentSubmissions: (ip: string) => Promise<number>
  uploadFile: (path: string, bytes: Uint8Array, contentType: string) => Promise<void>
  insertSubmission: (row: InsertRow) => Promise<void>
  createSignedUrls: (paths: string[]) => Promise<string[]>
  sendNotificationEmail: (args: { fields: ContactFormFields; signedUrls: string[] }) => Promise<void>
}

export interface HandlerResult {
  status: number
  body: { ok: boolean; message?: string; errors?: { field: string; message: string }[] }
}

export async function handleSubmission(req: SubmitRequest, deps: Deps): Promise<HandlerResult> {
  if (isHoneypotTripped(req.fields.honeypot)) {
    return { status: 200, body: { ok: true } }
  }

  const fieldErrors = validateFields(req.fields)
  if (fieldErrors.length > 0) {
    return { status: 400, body: { ok: false, errors: fieldErrors } }
  }

  const fileErrors = validateFiles(req.files)
  if (fileErrors.length > 0) {
    return {
      status: 400,
      body: { ok: false, errors: fileErrors.map((e) => ({ field: 'files', message: e.message })) },
    }
  }

  const recentCount = await deps.countRecentSubmissions(req.ip)
  if (isRateLimited(recentCount)) {
    return { status: 429, body: { ok: false, message: 'Please wait before sending another message.' } }
  }

  const turnstileOk = await deps.verifyTurnstile(req.turnstileToken, req.ip)
  if (!turnstileOk) {
    return { status: 400, body: { ok: false, message: 'Verification failed, please try again.' } }
  }

  const attachmentPaths: string[] = []
  for (const file of req.files) {
    const path = `${crypto.randomUUID()}-${file.name}`
    await deps.uploadFile(path, file.bytes, 'application/octet-stream')
    attachmentPaths.push(path)
  }

  await deps.insertSubmission({
    name: req.fields.name.trim(),
    email: req.fields.email.trim(),
    phone: req.fields.phone?.trim() || null,
    company: req.fields.company?.trim() || null,
    message: req.fields.message.trim(),
    attachment_paths: attachmentPaths,
    ip_address: req.ip,
  })

  const signedUrls = attachmentPaths.length > 0 ? await deps.createSignedUrls(attachmentPaths) : []

  await deps.sendNotificationEmail({ fields: req.fields, signedUrls })

  return { status: 200, body: { ok: true } }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
deno test supabase/functions/submit-contact-form/handler.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/submit-contact-form/handler.ts supabase/functions/submit-contact-form/handler.test.ts
git commit -m "Add contact form Edge Function orchestration logic, dependency-injected and tested with fakes"
```

---

### Task 4: Edge Function — real entrypoint, deploy, secrets, smoke test

**Files:**
- Create: `supabase/functions/submit-contact-form/index.ts`

**Interfaces:**
- Consumes: `handleSubmission`, `Deps`, `SubmitRequest`, `IncomingFile` (Task 3), `ContactFormFields` (Task 2).
- Produces: the deployed function at `https://cztatucsaltujvpdwvyd.supabase.co/functions/v1/submit-contact-form`, consumed by the frontend in Task 6.

- [ ] **Step 1: Write the real entrypoint**

Create `supabase/functions/submit-contact-form/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleSubmission, Deps, SubmitRequest, IncomingFile } from './handler.ts'
import { ContactFormFields } from './validation.ts'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
  }
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')!
  const body = new URLSearchParams({ secret, response: token, remoteip: ip })
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  })
  const data = await res.json()
  return data.success === true
}

async function countRecentSubmissions(ip: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('contact_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', oneHourAgo)
  if (error) throw error
  return count ?? 0
}

async function uploadFile(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await supabase.storage.from('contact-attachments').upload(path, bytes, { contentType })
  if (error) throw error
}

async function insertSubmission(row: {
  name: string
  email: string
  phone: string | null
  company: string | null
  message: string
  attachment_paths: string[]
  ip_address: string
}): Promise<void> {
  const { error } = await supabase.from('contact_submissions').insert(row)
  if (error) throw error
}

async function createSignedUrls(paths: string[]): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from('contact-attachments')
    .createSignedUrls(paths, 60 * 60 * 24)
  if (error) throw error
  return (data ?? []).map((d) => d.signedUrl)
}

async function sendNotificationEmail(args: { fields: ContactFormFields; signedUrls: string[] }): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')!
  const { fields, signedUrls } = args
  const imagesHtml = signedUrls.length
    ? `<p><strong>Attachments:</strong></p><ul>${signedUrls.map((u) => `<li><a href="${u}">${u}</a></li>`).join('')}</ul>`
    : ''
  const html = `
    <h2>New contact form submission</h2>
    <p><strong>Name:</strong> ${fields.name}</p>
    <p><strong>Email:</strong> ${fields.email}</p>
    <p><strong>Phone:</strong> ${fields.phone || '—'}</p>
    <p><strong>Company:</strong> ${fields.company || '—'}</p>
    <p><strong>Message:</strong></p>
    <p>${fields.message.replace(/\n/g, '<br>')}</p>
    ${imagesHtml}
  `
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Sharpable Contact Form <onboarding@resend.dev>',
      to: ['sharpablehq@gmail.com'],
      subject: `New contact form message from ${fields.name}`,
      html,
      reply_to: fields.email,
    }),
  })
  if (!res.ok) {
    throw new Error(`Resend API error: ${res.status} ${await res.text()}`)
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin ?? '') })
  }

  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ ok: false, message: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const formData = await req.formData()

    const fields: ContactFormFields = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      company: String(formData.get('company') ?? ''),
      message: String(formData.get('message') ?? ''),
      honeypot: String(formData.get('website') ?? ''),
    }

    const turnstileToken = String(formData.get('turnstileToken') ?? '')

    const fileEntries = formData.getAll('files').filter((f): f is File => f instanceof File)
    const files: IncomingFile[] = []
    for (const f of fileEntries) {
      const bytes = new Uint8Array(await f.arrayBuffer())
      files.push({ name: f.name, size: f.size, bytes })
    }

    const forwardedFor = req.headers.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'

    const deps: Deps = {
      verifyTurnstile,
      countRecentSubmissions,
      uploadFile,
      insertSubmission,
      createSignedUrls,
      sendNotificationEmail,
    }

    const request: SubmitRequest = { fields, files, turnstileToken, ip }
    const result = await handleSubmission(request, deps)

    return new Response(JSON.stringify(result.body), { status: result.status, headers })
  } catch (err) {
    console.error('submit-contact-form error:', err)
    return new Response(
      JSON.stringify({ ok: false, message: 'Something went wrong. Please try again later.' }),
      { status: 500, headers },
    )
  }
})
```

- [ ] **Step 2: Deploy the function**

Call the Supabase `deploy_edge_function` tool with `project_id: "cztatucsaltujvpdwvyd"`, `name: "submit-contact-form"`, and the file contents of `index.ts`, `handler.ts`, and `validation.ts` from this and the prior two tasks.

- [ ] **Step 3: Manual step — the user adds the three secrets**

Tell the user to go to the Supabase dashboard → "Sharpable Business" project → **Edge Functions** → **Secrets** (or **Project Settings → Edge Functions**), and add:

| Name | Value |
|---|---|
| `TURNSTILE_SECRET_KEY` | their Cloudflare Turnstile secret key |
| `RESEND_API_KEY` | their Resend API key |
| `ALLOWED_ORIGINS` | `https://sharpable.netlify.app,http://localhost:5173` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` do **not** need adding — Supabase injects those into every Edge Function automatically. Do not proceed to Step 4 until the user confirms all three are saved.

- [ ] **Step 4: Smoke-test the deployed function's guardrails (no real Turnstile token needed)**

These exercise the checks that run *before* Turnstile, so they're fully testable without a real browser:

```powershell
$url = "https://cztatucsaltujvpdwvyd.supabase.co/functions/v1/submit-contact-form"

# 1. Disallowed origin -> expect 403
try {
  Invoke-RestMethod -Method Post -Uri $url -Headers @{ Origin = "https://evil.example" }
} catch { Write-Host "Test 1 (bad origin):" $_.Exception.Response.StatusCode }

# 2. No origin header -> expect 403
try {
  Invoke-RestMethod -Method Post -Uri $url
} catch { Write-Host "Test 2 (no origin):" $_.Exception.Response.StatusCode }

# 3. Correct origin, honeypot filled -> expect 200 {"ok":true}
$form = @{ name = "Bot"; email = "bot@example.com"; message = "spam"; website = "http://spam.example" }
$r3 = Invoke-RestMethod -Method Post -Uri $url -Headers @{ Origin = "http://localhost:5173" } -Form $form
Write-Host "Test 3 (honeypot):" ($r3 | ConvertTo-Json -Compress)

# 4. Correct origin, missing required fields -> expect 400 with errors
try {
  Invoke-RestMethod -Method Post -Uri $url -Headers @{ Origin = "http://localhost:5173" } -Form @{ name = "" }
} catch { Write-Host "Test 4 (missing fields):" $_.Exception.Response.StatusCode }
```

Expected: Test 1 and 2 return 403. Test 3 returns `{"ok":true}` (fake success, and confirm via `execute_sql` — `select count(*) from contact_submissions` — that this did **not** insert a row). Test 4 returns 400.

Note: rate-limiting and the full Turnstile-verified happy path are already covered by `handler.test.ts`'s fakes (Task 3) and get their real, live proof in Task 7's browser test — they can't be meaningfully scripted here without a real Turnstile token.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/submit-contact-form/index.ts
git commit -m "Add real Edge Function entrypoint for the contact form, deployed and smoke-tested"
```

---

### Task 5: Frontend setup — dependency, env vars, translations

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `.env.local`
- Modify: `src/translations.js`

**Interfaces:**
- Produces: `import.meta.env.VITE_TURNSTILE_SITE_KEY`, `import.meta.env.VITE_SUPABASE_ANON_KEY`, and `t.contact.errors.{rateLimited,verificationFailed,generic}` — all consumed by Task 6.

- [ ] **Step 1: Install the Turnstile React library**

```bash
npm install @marsidev/react-turnstile
```

- [ ] **Step 2: Create `.env.example`** (committed — documents what's needed, holds no real secret)

```
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

- [ ] **Step 3: Create `.env.local`** (real values — already covered by the existing `*.local` gitignore rule)

```
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAEv5fTCkboTJS2Ud
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dGF0dWNzYWx0dWp2cGR3dnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTcyMDAsImV4cCI6MjA3NjE5MzIwMH0.pGylZ7WkR4oWZIavR0VvcVp78YHkx8gNyOLuR7I8h8s
```

- [ ] **Step 4: Verify `.env.local` is actually ignored by git**

```bash
git check-ignore -v .env.local
```

Expected: prints a match against the `*.local` rule in `.gitignore`. If it prints nothing, stop — that means the anon key (non-secret, but still shouldn't be committed carelessly) would get committed; add `.env.local` explicitly to `.gitignore` before continuing.

- [ ] **Step 5: Add error copy to `translations.js` (English)**

In `src/translations.js`, inside the `en.contact` object (the one at line 223, right after the `sent: { ... },` block that ends around line 251), add a new `errors` key:

```js
      errors: {
        rateLimited: "You've sent a few messages recently — please wait a bit before sending another.",
        verificationFailed: "We couldn't verify your submission. Please try again.",
        generic: 'Something went wrong on our end. Please try again, or email us directly.',
      },
```

- [ ] **Step 6: Add error copy to `translations.js` (Bahasa Melayu)**

In the same file, inside the `ms.contact` object (the one at line 529, right after its `sent: { ... },` block), add:

```js
      errors: {
        rateLimited: 'Anda telah menghantar beberapa mesej baru-baru ini — sila tunggu sebentar sebelum menghantar lagi.',
        verificationFailed: 'Kami tidak dapat mengesahkan penghantaran anda. Sila cuba lagi.',
        generic: 'Terdapat masalah di pihak kami. Sila cuba lagi, atau e-mel kami secara terus.',
      },
```

- [ ] **Step 7: Verify the app still starts cleanly**

```bash
npm run dev
```

Expected: Vite starts with no errors (a malformed `translations.js` edit would show as a syntax error here).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.example src/translations.js
git commit -m "Add Turnstile dependency, env var scaffolding, and contact form error copy (en + ms)"
```

(`.env.local` is intentionally never committed.)

---

### Task 6: Frontend — wire the real submit flow into `ContactForm.jsx`

**Files:**
- Create: `src/contactFormApi.js`
- Modify: `src/components/ContactForm.jsx`

**Interfaces:**
- Consumes: `VITE_TURNSTILE_SITE_KEY`, `VITE_SUPABASE_ANON_KEY`, `t.contact.errors.*` (Task 5); the deployed function URL (Task 4).

- [ ] **Step 1: Create the API wrapper**

Create `src/contactFormApi.js`:

```js
const FUNCTION_URL = 'https://cztatucsaltujvpdwvyd.supabase.co/functions/v1/submit-contact-form'
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function submitContactForm({ name, email, phone, company, message, honeypot, turnstileToken, files }) {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('email', email)
  formData.append('phone', phone)
  formData.append('company', company)
  formData.append('message', message)
  formData.append('website', honeypot)
  formData.append('turnstileToken', turnstileToken)
  files.forEach((file) => formData.append('files', file))

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON_KEY}` },
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  return { status: res.status, ok: res.ok && data.ok === true, ...data }
}
```

- [ ] **Step 2: Replace `src/components/ContactForm.jsx` with the wired-up version**

```jsx
import { useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, Lock, Mail, MapPin, Phone, Upload } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'
import { useLanguage } from '../useLanguage.js'
import Field from './Field.jsx'
import { submitContactForm } from '../contactFormApi.js'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export default function ContactForm() {
  const { t } = useLanguage()
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '', website: '' })
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const dropRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setStatus('sending')
    setErrorMessage('')

    const result = await submitContactForm({
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      message: form.message,
      honeypot: form.website,
      turnstileToken,
      files,
    })

    if (result.ok) {
      setStatus('sent')
      return
    }

    setStatus('idle')
    if (result.status === 429) {
      setErrorMessage(t.contact.errors.rateLimited)
    } else if (result.status === 400) {
      setErrorMessage(t.contact.errors.verificationFailed)
    } else {
      setErrorMessage(t.contact.errors.generic)
    }
  }

  const handleFiles = (newFiles) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles)].slice(0, 5))
  }

  return (
    <section id="contact" className="relative py-24 sm:py-32 px-6 sm:px-10 lg:px-16 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Left: heading + info */}
          <div className="lg:col-span-5">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">
              ╱ {t.contact.eyebrow}
            </span>
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink mt-4 leading-[1.05] tracking-tight">
              {t.contact.heading1}
              <span className="block font-serif italic font-medium text-primary text-5xl sm:text-6xl md:text-7xl">{t.contact.heading2}</span>
            </h2>
            <p className="text-muted text-lg mt-6 leading-relaxed max-w-md">
              {t.contact.sub}
            </p>

            <div className="mt-10 space-y-4">
              <a href="tel:+60195806090" className="lift-on-hover flex items-center gap-4 group">
                <span className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary transition">
                  <Phone className="h-5 w-5 text-primary group-hover:text-deep" />
                </span>
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">{t.contact.callUs}</span>
                  <span className="font-display font-semibold text-ink text-lg">+6019 580 6090</span>
                </span>
              </a>

              <a href="mailto:sharpablehq@gmail.com" className="lift-on-hover flex items-center gap-4 group">
                <span className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary transition">
                  <Mail className="h-5 w-5 text-primary group-hover:text-deep" />
                </span>
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">{t.contact.emailUs}</span>
                  <span className="font-display font-semibold text-ink text-lg">sharpablehq@gmail.com</span>
                </span>
              </a>

              <div className="flex items-center gap-4">
                <span className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </span>
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">{t.contact.based}</span>
                  <span className="font-display font-semibold text-ink text-lg">{t.contact.location}</span>
                </span>
              </div>
            </div>

            <div className="mt-10">
              <button
                type="button"
                onClick={() => setPrivacyOpen((v) => !v)}
                aria-expanded={privacyOpen}
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary-dark"
              >
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {t.contact.privacyTitle}
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${privacyOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: privacyOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="text-sm text-muted leading-relaxed pt-2 max-w-sm">
                    {t.contact.privacyText}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="bg-surface border border-divider rounded-5xl p-7 sm:p-10 shadow-2xl shadow-primary/15">
              {status !== 'sent' ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label={t.contact.form.name} required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                    <Field label={t.contact.form.email} type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                    <Field label={t.contact.form.phone} type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                    <Field label={t.contact.form.company} value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
                  </div>

                  {/* Honeypot: hidden off-screen (not display:none, which bots increasingly skip). Real visitors never see or fill it. */}
                  <input
                    type="text"
                    name="website"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="fixed -left-[9999px] top-0 w-px h-px overflow-hidden opacity-0 pointer-events-none"
                  />

                  <div className="mt-5">
                    <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2 block">
                      {t.contact.form.message}
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required
                      rows={5}
                      placeholder={t.contact.form.messagePlaceholder}
                      className="w-full bg-background border border-divider rounded-2xl px-4 py-3.5 text-ink placeholder-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition resize-none font-body"
                    />
                  </div>

                  <div
                    ref={dropRef}
                    onDragOver={(e) => {
                      e.preventDefault()
                      dropRef.current?.classList.add('!border-primary', '!bg-primary/5')
                    }}
                    onDragLeave={() => {
                      dropRef.current?.classList.remove('!border-primary', '!bg-primary/5')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      dropRef.current?.classList.remove('!border-primary', '!bg-primary/5')
                      handleFiles(e.dataTransfer.files)
                    }}
                    className="mt-5 border-2 border-dashed border-divider rounded-3xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <input type="file" multiple id="file-up" className="hidden" onChange={(e) => handleFiles(e.target.files)} accept="image/*" />
                    <label htmlFor="file-up" className="cursor-pointer block">
                      <Upload className="h-6 w-6 mx-auto text-primary-dark mb-2" />
                      <p className="font-display font-semibold text-ink text-sm">{t.contact.form.upload}</p>
                      <p className="text-xs text-muted mt-1">{t.contact.form.uploadHint}</p>
                      {files.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                          {files.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary-dark text-xs px-3 py-1.5 rounded-full font-mono">
                              <CheckCircle2 className="h-3 w-3" />
                              {f.name.length > 22 ? f.name.slice(0, 22) + '…' : f.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="mt-5 flex justify-center">
                    <Turnstile
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={setTurnstileToken}
                      onExpire={() => setTurnstileToken('')}
                      options={{ theme: 'dark', size: 'flexible' }}
                    />
                  </div>

                  {errorMessage && <p className="mt-4 text-sm text-red-400 text-center">{errorMessage}</p>}

                  <div className="mt-7 flex flex-col items-center gap-3">
                    <button
                      type="submit"
                      disabled={status === 'sending' || !turnstileToken}
                      className="magnetic-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-deep font-semibold px-7 py-3.5 rounded-full shadow-lg shadow-primary/30 disabled:opacity-50"
                    >
                      {status === 'sending' ? t.contact.form.sending : t.contact.form.submit}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-muted">{t.contact.form.note}</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-8 w-8 text-primary-dark" />
                  </div>
                  <h3 className="font-display font-bold text-2xl text-ink mb-3">{t.contact.sent.title}</h3>
                  <p className="text-muted max-w-md mx-auto">
                    {t.contact.sent.text}
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/contactFormApi.js src/components/ContactForm.jsx
git commit -m "Wire ContactForm up to the real Edge Function: Turnstile, honeypot, real submit/error states"
```

---

### Task 7: End-to-end verification in the real browser

**Files:** none (verification only)

- [ ] **Step 1: Add `localhost` as an allowed Turnstile domain**

The Turnstile widget was created for `sharpable.netlify.app` only — it will fail to render/verify on `localhost` otherwise. Tell the user to go to the Cloudflare dashboard → Turnstile → the "Sharpable Contact Form" widget → Settings, and add `localhost` as an additional domain. Do not proceed until confirmed.

- [ ] **Step 2: Start the dev server and open it**

Use `preview_start` with `{ name: "..." }` per `.claude/launch.json` (create it if missing, pointing at `npm run dev` on Vite's port), then navigate to `http://localhost:5173/#contact` (or whatever port Vite actually bound — check the terminal output).

- [ ] **Step 3: Confirm the Turnstile widget renders**

Use `read_page` or `computer{action:"screenshot"}` on the contact section. Expected: a small Cloudflare Turnstile widget is visible above the submit button, and it auto-resolves (shows a checkmark) within a couple seconds without interaction — this is Managed mode's normal behavior.

- [ ] **Step 4: Submit a real, valid message end-to-end**

Fill in Name, Email, Message (use a throwaway test message), leave the honeypot untouched (it's off-screen, don't interact with it), wait for the Turnstile widget to resolve, then click Submit.

Expected: the button shows "Sending...", then the form is replaced by the existing "Thanks — we'll be in touch" confirmation screen.

- [ ] **Step 5: Verify the row actually landed in the database**

Call `execute_sql` with `project_id: "cztatucsaltujvpdwvyd"`:

```sql
select id, created_at, name, email, message from public.contact_submissions order by created_at desc limit 1;
```

Expected: the row matching what was just submitted.

- [ ] **Step 6: Verify the notification email arrived**

Ask the user to check `sharpablehq@gmail.com` (including spam folder, since `onboarding@resend.dev` is a shared sandbox sender) for a message titled "New contact form message from [test name]".

- [ ] **Step 7: Test the honeypot path doesn't create noise**

Using `javascript_tool`, directly set the honeypot input's value and dispatch an input event before submitting (simulating a bot that fills every field):

```js
document.querySelector('input[name="website"]').value = 'http://spam.example'
document.querySelector('input[name="website"]').dispatchEvent(new Event('input', { bubbles: true }))
```

Then submit the form normally. Expected: UI still shows the "sent" confirmation (fake success, by design), but `execute_sql`'s row count for `contact_submissions` should **not** have increased from Step 5's count — confirming the honeypot silently dropped it.

- [ ] **Step 8: Final review of what's NOT yet done**

Confirm with the user that everything above is working, then stop — per the Global Constraints, this plan does not deploy to Netlify. The next time they're ready to go live, the only remaining step is adding `VITE_TURNSTILE_SITE_KEY` and `VITE_SUPABASE_ANON_KEY` as Netlify environment variables (Site settings → Environment variables) before the next `netlify deploy --prod`, since Vite bakes `VITE_*` vars in at build time.

- [ ] **Step 9: Update `NEXT-STEPS.md` and `CLAUDE.md`**

Mark item 2 in `NEXT-STEPS.md` ("Contact form → real backend") as done, with a short summary of what shipped and a pointer to this plan file. Add a `ContactForm` entry to `CLAUDE.md`'s "Notable Component Behaviors" section replacing the old "UI-only" description, covering: the real Edge Function pipeline, the `contact_submissions` table's zero-policy RLS lockdown, the honeypot/Turnstile/rate-limit stack, and the Netlify env var step still pending before the next production deploy.

- [ ] **Step 10: Commit the documentation updates**

```bash
git add NEXT-STEPS.md CLAUDE.md
git commit -m "Document the shipped contact form backend in NEXT-STEPS.md and CLAUDE.md"
```
