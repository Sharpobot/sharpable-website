import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Languages, Menu, Sparkles, X } from 'lucide-react'
import { useLanguage } from '../useLanguage.js'

export default function Navbar() {
  const { t, lang, toggleLang } = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Mobile browsers resize the *visual* viewport (not the layout viewport) while their address bar
  // auto-hides/shows during a scroll gesture. A plain `position: fixed` nav is anchored to the layout
  // viewport, so on browsers where that animation isn't perfectly in sync it can visibly shift up and
  // clip against the top edge mid-scroll. `visualViewport.offsetTop` reports exactly that mismatch —
  // compensating the nav's own transform with it keeps the pill pinned to the real visible top edge
  // regardless of how the browser chrome is animating.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => {
      if (navRef.current) {
        navRef.current.style.transform = `translate3d(-50%, ${vv.offsetTop}px, 0)`
      }
    }
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    sync()
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [])

  const NAV_LINKS = [
    { label: t.nav.home, href: '#home' },
    { label: t.nav.services, href: '#services' },
    { label: t.nav.approach, href: '#approach' },
    { label: t.nav.process, href: '#process' },
    { label: t.nav.work, href: '#work' },
    { label: t.nav.transformation, href: '#transformation' },
    { label: t.nav.contact, href: '#contact' },
  ]

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-4 left-1/2 z-50 transition-[background-color,box-shadow,border-color] duration-500 will-change-transform ${
          scrolled ? 'glass shadow-lg shadow-primary/10' : 'bg-transparent'
        } rounded-full px-4 sm:px-6 py-2.5 w-[calc(100%-2rem)] max-w-6xl`}
        style={{ transform: 'translate3d(-50%, 0, 0)' }}
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

          <div className="hidden lg:flex items-center gap-6">
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

          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={toggleLang}
              aria-label="Toggle language"
              className={`lift-on-hover inline-flex items-center gap-1.5 border px-3 py-2 rounded-full text-xs font-mono uppercase tracking-widest transition-colors ${
                scrolled
                  ? 'border-divider text-ink/70 hover:text-primary hover:border-primary/40'
                  : 'border-white/25 text-white/80 hover:text-white hover:border-white/50'
              }`}
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === 'en' ? 'EN / BM' : 'BM / EN'}
            </button>
            <a
              href="#contact"
              className="magnetic-btn inline-flex items-center gap-1.5 bg-primary text-deep px-4 py-2 rounded-full text-sm font-semibold shadow-lg shadow-primary/30"
            >
              {t.nav.cta}
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </a>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={toggleLang}
              aria-label="Toggle language"
              className={`inline-flex items-center gap-1 border px-2.5 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest transition-colors ${
                scrolled
                  ? 'border-divider text-ink/70'
                  : 'border-white/25 text-white/80'
              }`}
            >
              <Languages className="h-3 w-3" />
              {lang === 'en' ? 'EN' : 'BM'}
            </button>
            <button
              onClick={() => setOpen(true)}
              className={`p-2 rounded-full ${scrolled ? 'text-ink' : 'text-white'}`}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu — the panel reveals like a frame dropping down (clip-path growing from the
          top edge) rather than the whole rectangle sliding + fading in from off-screen; the dimmed
          backdrop still gets its own simple opacity fade, decoupled from the panel's own animation. */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-deep/90 backdrop-blur-2xl transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />
        <div
          className="absolute top-0 left-0 right-0 bg-background rounded-b-5xl px-6 pt-8 pb-12 max-h-[100dvh] overflow-y-auto"
          style={{
            clipPath: open ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
            transition: 'clip-path 0.55s cubic-bezier(0.65, 0, 0.35, 1)',
          }}
        >
          {/* Content fades/drops in a beat after the frame starts revealing (staggered per row),
              rather than just appearing wherever the clip boundary happens to have reached — that
              extra lag is what reads as depth instead of the content being flatly stuck to the frame. */}
          <div
            className={`flex items-center justify-between mb-10 transition-all duration-[400ms] ease-out ${
              open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
            style={{ transitionDelay: open ? '140ms' : '0ms' }}
          >
            <span className="font-display font-bold text-xl text-ink">Sharpable</span>
            <button onClick={() => setOpen(false)} className="p-2 rounded-full bg-divider/40">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`font-display text-3xl font-semibold text-ink py-3 border-b border-divider transition-all duration-[400ms] ease-out ${
                  open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                }`}
                style={{ transitionDelay: open ? `${180 + i * 40}ms` : '0ms' }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className={`mt-8 magnetic-btn flex items-center justify-center gap-2 bg-primary text-deep px-6 py-4 rounded-full font-semibold w-full transition-all duration-[400ms] ease-out ${
              open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
            style={{ transitionDelay: open ? `${180 + NAV_LINKS.length * 40 + 40}ms` : '0ms' }}
          >
            {t.nav.cta}
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </>
  )
}
