import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useLegalPageTransition } from './useLegalPageTransition.js'

export default function PrivacyPolicy() {
  const { pageClassName, handleBack } = useLegalPageTransition()

  return (
    <div className="min-h-screen bg-background text-ink">
      <div className={`${pageClassName} max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24`}>
        <Link to="/" onClick={handleBack} className="inline-flex items-center gap-2 text-sm font-medium text-primary-dark hover:text-primary transition mb-10">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Sparkles className="h-5 w-5 text-deep" strokeWidth={2.4} />
          </span>
          <span className="font-display font-bold text-lg">Sharpable</span>
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight mb-3">Privacy Policy</h1>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-12">Last updated: June 2026</p>

        <div className="space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">1. Information we collect</h2>
            <p>
              When you contact us through our website, we collect the information you provide directly —
              such as your name, email address, phone number, company or website, and the contents of your
              message, including any files you choose to attach.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">2. How we use your information</h2>
            <p>
              We use the information you provide solely to respond to your inquiry, discuss your project,
              and provide the services you request. We do not use your information for unrelated marketing
              without your consent.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">3. Sharing your information</h2>
            <p>
              We do not sell, rent, or share your personal information with third parties, except where
              required to provide a service you've requested (such as a payment processor) or where
              required by law.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">4. Data storage and security</h2>
            <p>
              Your information is stored securely and retained only for as long as necessary to respond to
              your inquiry or fulfill our agreement with you. We take reasonable measures to protect your
              data from unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">5. Your rights</h2>
            <p>
              You can request access to, correction of, or deletion of your personal information at any
              time by contacting us at{' '}
              <a href="mailto:sharpablehq@gmail.com" className="text-primary-dark hover:text-primary transition">
                sharpablehq@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">6. Contact</h2>
            <p>
              If you have any questions about this privacy policy, reach out to us at{' '}
              <a href="mailto:sharpablehq@gmail.com" className="text-primary-dark hover:text-primary transition">
                sharpablehq@gmail.com
              </a>{' '}
              or call{' '}
              <a href="tel:+60195806090" className="text-primary-dark hover:text-primary transition">
                +6019 580 6090
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
