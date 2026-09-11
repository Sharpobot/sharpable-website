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
