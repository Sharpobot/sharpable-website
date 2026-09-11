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
