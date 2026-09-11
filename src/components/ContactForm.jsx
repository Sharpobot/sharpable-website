import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, Loader2, Lock, Mail, MapPin, Phone, Upload, X } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'
import { useLanguage } from '../useLanguage.js'
import Field from './Field.jsx'
import { submitContactForm } from '../contactFormApi.js'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const MAX_MESSAGE_LENGTH = 5000

export default function ContactForm() {
  const { t } = useLanguage()
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '', website: '' })
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [fileError, setFileError] = useState('')
  const [previewFile, setPreviewFile] = useState(null)
  const [removingFiles, setRemovingFiles] = useState(() => new Set())
  const [uploadAreaHeight, setUploadAreaHeight] = useState(0)
  const dropRef = useRef(null)
  const uploadContentRef = useRef(null)
  const errorRef = useRef(null)

  // Moves keyboard/screen-reader focus to the error message the moment it appears,
  // so assistive tech announces it immediately rather than leaving the user to
  // discover a silent, purely-visual error (role="alert" below announces the text;
  // this ensures focus is actually there too, per WCAG error-handling guidance).
  useEffect(() => {
    if (errorMessage) {
      errorRef.current?.focus()
    }
  }, [errorMessage])

  // Measures the attachments row's real content height so the dropzone can smoothly
  // animate to/from that exact size (an explicit `height`, not `max-height` — in this
  // exact environment `max-height` transitions on this element mysteriously compute to
  // 0 regardless of the value set, confirmed by isolating every other suspect; a plain
  // `height` driven by a real measurement does not have that problem).
  useLayoutEffect(() => {
    if (uploadContentRef.current) {
      setUploadAreaHeight(uploadContentRef.current.scrollHeight)
    }
  }, [files, fileError])

  const previewUrls = useMemo(
    () => files.map((f) => (f.type?.startsWith('image/') ? URL.createObjectURL(f) : null)),
    [files]
  )

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => url && URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const previewFileIndex = previewFile ? files.indexOf(previewFile) : -1
  const previewUrl = previewFileIndex >= 0 ? previewUrls[previewFileIndex] : null

  useEffect(() => {
    if (!previewFile) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPreviewFile(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewFile])

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
    setFiles((prev) => {
      const combined = [...prev, ...Array.from(newFiles)]
      setFileError(combined.length > 5 ? t.contact.form.maxFilesReached : '')
      return combined.slice(0, 5)
    })
  }

  const removeFile = (file) => {
    setRemovingFiles((prev) => new Set(prev).add(file))
    setTimeout(() => {
      setFiles((prev) => prev.filter((f) => f !== file))
      setRemovingFiles((prev) => {
        const next = new Set(prev)
        next.delete(file)
        return next
      })
      setFileError('')
    }, 200)
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
                    <Field id="contact-name" label={t.contact.form.name} required value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoComplete="name" />
                    <Field id="contact-email" label={t.contact.form.email} type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" />
                    <Field id="contact-phone" label={t.contact.form.phone} type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} autoComplete="tel" />
                    <Field id="contact-company" label={t.contact.form.company} value={form.company} onChange={(v) => setForm({ ...form, company: v })} autoComplete="organization" />
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
                    <div className="flex items-baseline justify-between mb-2">
                      <label htmlFor="contact-message" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted block">
                        {t.contact.form.message}
                      </label>
                      <span className="font-mono text-[10px] text-muted/70 tabular-nums">
                        {form.message.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
                      </span>
                    </div>
                    <textarea
                      id="contact-message"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required
                      maxLength={MAX_MESSAGE_LENGTH}
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
                    </label>

                    {/* Smoothly extends/collapses the dropzone as images are added/removed, instead
                        of the box snapping to a new height. Height is measured from the real
                        content (uploadContentRef) rather than a guessed fixed number, so it always
                        matches exactly — no wasted empty space, no risk of clipping. */}
                    <div
                      className="overflow-hidden transition-[height] duration-300 ease-out"
                      style={{ height: files.length > 0 ? `${uploadAreaHeight}px` : '0px' }}
                    >
                      <div ref={uploadContentRef}>
                        {files.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-divider/60 grid grid-cols-5 gap-2">
                          {files.map((file, i) => {
                            const url = previewUrls[i]
                            const isRemoving = removingFiles.has(file)
                            return (
                              <div
                                key={`${file.name}-${file.size}-${file.lastModified}`}
                                className={`relative ${isRemoving ? 'animate-thumb-out pointer-events-none' : 'animate-thumb-in'}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => url && setPreviewFile(file)}
                                  disabled={!url}
                                  className="block w-full aspect-square rounded-lg overflow-hidden border border-divider bg-deep focus:outline-none focus:ring-4 focus:ring-primary/15"
                                >
                                  {url ? (
                                    <img src={url} alt={file.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="flex items-center justify-center h-full px-1 text-center text-[8px] text-muted leading-tight">
                                      {file.name}
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeFile(file)}
                                  aria-label={t.contact.form.removeFile}
                                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-deep border border-divider flex items-center justify-center text-muted hover:text-ink hover:border-primary transition"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                        )}

                        {fileError && <p className="mt-3 text-xs text-red-400">{fileError}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-center">
                    <Turnstile
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={setTurnstileToken}
                      onExpire={() => setTurnstileToken('')}
                      options={{ theme: 'dark', size: 'flexible' }}
                    />
                  </div>

                  {errorMessage && (
                    <p ref={errorRef} role="alert" tabIndex={-1} className="mt-4 text-sm text-red-400 text-center outline-none">
                      {errorMessage}
                    </p>
                  )}

                  <div className="mt-7 flex flex-col items-center gap-3">
                    <button
                      type="submit"
                      disabled={status === 'sending' || !turnstileToken}
                      className="magnetic-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-deep font-semibold px-7 py-3.5 rounded-full shadow-lg shadow-primary/30 disabled:opacity-50"
                    >
                      {status === 'sending' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t.contact.form.sending}
                        </>
                      ) : (
                        <>
                          {t.contact.form.submit}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
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

      {previewFile && previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-deep/90 backdrop-blur-sm p-4 sm:p-8"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="animate-modal-in relative w-full max-w-lg aspect-square sm:aspect-[4/3] bg-surface border border-divider rounded-3xl overflow-hidden flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewUrl}
              alt={previewFile.name}
              className="max-w-full max-h-full w-auto h-auto object-contain"
            />
            <button
              type="button"
              onClick={() => setPreviewFile(null)}
              aria-label={t.contact.form.closePreview}
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-deep/80 border border-divider flex items-center justify-center text-ink hover:border-primary transition"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="absolute bottom-0 inset-x-0 bg-deep/80 backdrop-blur-sm px-4 py-2.5 text-xs text-muted truncate">
              {previewFile.name}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
