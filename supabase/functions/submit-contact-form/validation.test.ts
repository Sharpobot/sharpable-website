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
