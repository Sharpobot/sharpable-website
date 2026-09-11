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
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
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
