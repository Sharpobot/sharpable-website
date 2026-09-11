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
