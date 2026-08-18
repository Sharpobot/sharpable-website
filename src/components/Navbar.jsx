import { useEffect, useState } from 'react'
import { ArrowUpRight, Menu, Sparkles, X } from 'lucide-react'
import { NAV_LINKS } from '../constants.js'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
          scrolled ? 'glass shadow-lg shadow-primary/10' : 'bg-transparent'
        } rounded-full px-4 sm:px-6 py-2.5 w-[calc(100%-2rem)] max-w-5xl`}
      >
        <div className="flex items-center justify-between gap-6">
          <a href="#home" className="flex items-center gap-2 group">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Sparkles className="h-5 w-5 text-deep" strokeWidth={2.4} />
              <span className="absolute inset-0 rounded-full ring-2 ring-primary/30 group-hover:ring-primary/50 transition" />
            </span>
            <span
              className={`font-display font-bold tracking-tight text-lg ${
                scrolled ? 'text-ink' : 'text-white'
              } transition-colors`}
            >
              Sharpable
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium tracking-tight lift-on-hover ${
                  scrolled ? 'text-ink/70 hover:text-primary' : 'text-white/90 hover:text-white'
                } transition-colors`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <a
            href="#contact"
            className="hidden lg:inline-flex magnetic-btn items-center gap-1.5 bg-primary text-deep px-4 py-2 rounded-full text-sm font-semibold shadow-lg shadow-primary/30"
          >
            Get a quote
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
          </a>

          <button
            onClick={() => setOpen(true)}
            className={`lg:hidden p-2 rounded-full ${scrolled ? 'text-ink' : 'text-white'}`}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-[60] transition-all duration-500 lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-deep/90 backdrop-blur-2xl" onClick={() => setOpen(false)} />
        <div
          className={`absolute top-0 left-0 right-0 bg-background rounded-b-5xl px-6 pt-8 pb-12 transition-transform duration-500 ${
            open ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between mb-10">
            <span className="font-display font-bold text-xl text-ink">Sharpable</span>
            <button onClick={() => setOpen(false)} className="p-2 rounded-full bg-divider/40">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-display text-3xl font-semibold text-ink py-3 border-b border-divider"
              >
                {link.label}
              </a>
            ))}
          </div>
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="mt-8 magnetic-btn flex items-center justify-center gap-2 bg-primary text-deep px-6 py-4 rounded-full font-semibold w-full"
          >
            Get a quote
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </>
  )
}
