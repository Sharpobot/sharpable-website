import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { SERVICES_FULL } from '../constants.js'

export default function Footer() {
  return (
    <footer className="relative bg-deep text-white rounded-t-6xl mt-12 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-15" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[40rem] rounded-full bg-primary/20 blur-3xl" />

      <div className="relative px-6 sm:px-10 lg:px-16 pt-20 pb-10 max-w-7xl mx-auto">
        <div className="border-b border-white/10 pb-12 mb-12">
          <h2 className="font-display font-extrabold text-5xl sm:text-7xl md:text-8xl leading-[0.92] tracking-tight">
            Let's make it
            <span className="font-serif italic font-medium text-primary block text-6xl sm:text-8xl md:text-9xl">Sharpable.</span>
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-8 gap-6">
            <p className="text-white/50 max-w-md">
              Sharpable designs and builds premium websites for small businesses, made to help them grow online.
            </p>
            <a href="#contact" className="magnetic-btn inline-flex items-center gap-2 bg-primary text-deep font-semibold px-7 py-3.5 rounded-full self-start sm:self-auto">
              Get a quote
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-deep" strokeWidth={2.4} />
              </span>
              <span className="font-display font-bold text-lg">Sharpable</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              We design and build premium, fast, conversion-focused websites for small businesses —
              custom code, no templates.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <span className="relative h-2 w-2 rounded-full bg-primary">
                <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
                Studio open · taking new projects
              </span>
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-4">Services</p>
            <ul className="space-y-2.5">
              {SERVICES_FULL.slice(0, 4).map((s, i) => (
                <li key={i}>
                  <a href="#services" className="text-white/65 hover:text-primary transition text-sm">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-4">Studio</p>
            <ul className="space-y-2.5">
              <li><a href="#approach" className="text-white/65 hover:text-primary transition text-sm">Approach</a></li>
              <li><a href="#process" className="text-white/65 hover:text-primary transition text-sm">Process</a></li>
              <li><a href="#contact" className="text-white/65 hover:text-primary transition text-sm">Contact</a></li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-4">Contact</p>
            <ul className="space-y-2.5">
              <li>
                <a href="tel:+60195806090" className="text-white/65 hover:text-primary transition text-sm">
                  +6019 580 6090
                </a>
              </li>
              <li>
                <a href="mailto:sharpablehq@gmail.com" className="text-white/65 hover:text-primary transition text-sm">
                  sharpablehq@gmail.com
                </a>
              </li>
              <li className="text-white/65 text-sm">Kuala Lumpur — Malaysia</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center sm:justify-end gap-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/50 text-xs font-mono">
            <Link to="/privacy" className="hover:text-primary transition">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition">Terms</Link>
            <span>© 2026 Sharpable</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
