import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary-dark hover:text-primary transition mb-10">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Sparkles className="h-5 w-5 text-deep" strokeWidth={2.4} />
          </span>
          <span className="font-display font-bold text-lg">Sharpable</span>
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight mb-3">Terms of Service</h1>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-12">Last updated: June 2026</p>

        <div className="space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">1. Services</h2>
            <p>
              Sharpable provides custom website design, development, animation, SEO, e-commerce, brand
              identity, and ongoing support services for small businesses. The specific scope, timeline,
              and cost of any project will be agreed upon separately with each client before work begins.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">2. Project process</h2>
            <p>
              Projects typically proceed through discovery, design and build, and launch phases. Timelines
              are estimates and may vary depending on project scope, feedback turnaround, and availability
              of content from the client.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">3. Client responsibilities</h2>
            <p>
              Clients are responsible for providing timely feedback, content, and assets needed to complete
              a project. Delays in providing this material may affect the agreed timeline.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">4. Payment</h2>
            <p>
              Payment terms, including deposits and milestones, will be outlined in a separate proposal or
              agreement for each project. Ownership of final deliverables transfers upon receipt of full
              payment.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">5. Intellectual property</h2>
            <p>
              Upon final payment, clients receive ownership of the custom code and design created
              specifically for their project. Sharpable retains the right to showcase completed work in its
              own portfolio unless otherwise agreed.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">6. Limitation of liability</h2>
            <p>
              Sharpable will make every reasonable effort to deliver high-quality work, but is not liable
              for indirect or consequential damages arising from the use of a delivered website.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-ink mb-2">7. Contact</h2>
            <p>
              Questions about these terms can be directed to{' '}
              <a href="mailto:hello@sharpable.com" className="text-primary-dark hover:text-primary transition">
                hello@sharpable.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
