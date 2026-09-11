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
