import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Languages, Menu, X } from 'lucide-react'
import { useLanguage } from '../useLanguage.js'
import Logo from './Logo.jsx'

export default function Navbar() {
  const { t, lang, toggleLang } = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const navRef = useRef(null)
  const menuRef = useRef(null)

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
        navRef.current.style.transform = `translate3d(0, ${vv.offsetTop}px, 0)`
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

  // Same visualViewport mismatch as above, applied to the open mobile menu overlay: scrolling the
  // link list itself (once it's tall enough to need its own scroll) is enough to trigger a mobile
  // browser's address-bar collapse animation, and without this the fixed overlay — anchored to the
  // layout viewport — visibly shifts against that animation instead of staying pinned in place.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => {
      if (menuRef.current) {
        menuRef.current.style.transform = `translate3d(0, ${vv.offsetTop}px, 0)`
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

  // Locks the background page while the menu is open — otherwise a touch-drag on the backdrop can
  // scroll the page underneath, which is both a bad experience for a modal-style overlay and another
  // way to trigger the same address-bar-collapse shift the effect above is compensating for.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevOverflow
    }
  }, [open])

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
      {/* Below lg (the same breakpoint that switches to the hamburger menu), the scrolled state goes
          full-bleed — edge-to-edge, solid, square-cornered — instead of staying a floating pill with
          visible gaps a translucent fill lets content show through. A plain rectangle reads as more
          standard nav chrome than a big rounded pill once it's flush with the screen edges. Desktop
          keeps the pill at every scroll position: there's no space pressure there, so it doesn't need
          to morph.
          Left/right padding is deliberately asymmetric (pr smaller than pl by ~8px, the hamburger
          button's own p-2): the logo's visible pixels touch the padding edge directly, but the
          hamburger icon sits 8px further in because its button adds its own padding around it —
          without compensating, the icon reads as having more breathing room than the logo despite
          identical container padding. Measured via getBoundingClientRect before this fix: 16px from
          the container edge to the logo's visible pixels vs 24px to the hamburger icon's.
          The pill's own radius is an explicit 28px, not `rounded-full`: at this pill's ~56px height,
          `rounded-full` (9999px) already renders as exactly 28px (browsers clamp it to half the
          shorter side), so this looks identical at rest — but animating a `border-radius` transition
          FROM 9999px barely reads as smooth, because the rendered value stays clamped at ~28px for
          nearly the whole transition and only visibly drops in the last sliver of it. Starting from
          the real 28px instead makes the radius interpolate evenly across the full 500ms.
          Positioned via `inset-x` + `max-w-6xl mx-auto`, not `left-1/2` + a `translateX(-50%)` +
          `width: calc(100% - 2rem)`. The old approach depends on percentage-width math resolving
          against the true viewport — but this page has decorative blur/glow elements that bleed past
          the viewport edge (intentionally, for the ambient background effect), and on at least one
          browser this measurably inflated the layout width `calc(100%...)` resolves against by ~12px,
          silently pushing the whole pill ~6px right of true-center. That's what caused the "logo has
          more breathing room than the hamburger" asymmetry, and separately let the pill's right edge
          (border included) fall past the real edge and get clipped. `inset-x-*` sets `left`/`right`
          directly instead of computing a `%` width, so it can't be thrown off by that inflation —
          it's simpler *and* the actual bug fix, not just a style preference. */}
      <nav
        ref={navRef}
        className={`fixed max-w-6xl mx-auto z-50 will-change-transform
          transition-[background-color,box-shadow,border-color,left,right,padding,border-radius,top] duration-500 ease-out
          lg:inset-x-4 lg:top-4 lg:rounded-full lg:px-4 lg:py-2.5 ${
          scrolled
            ? 'glass border-transparent lg:border-[rgba(255,198,41,0.18)] shadow-lg shadow-primary/10 top-0 inset-x-0 rounded-none pl-5 pr-3 sm:pl-6 sm:pr-4 py-3'
            : 'bg-transparent top-4 inset-x-4 rounded-[28px] pl-4 pr-2 sm:pl-6 sm:pr-4 py-2.5'
        }`}
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        <div className="flex items-center justify-between gap-6">
          <a href="#home" className="flex items-center group">
            <Logo className="h-8" />
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

          <div className="flex lg:hidden items-center gap-3">
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
      <div
        ref={menuRef}
        className={`fixed inset-0 z-[60] lg:hidden will-change-transform ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div
          className={`absolute inset-0 bg-deep/90 backdrop-blur-2xl transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />
        <div
          className="absolute top-0 left-0 right-0 bg-background rounded-b-5xl px-6 pt-[clamp(1.25rem,3.4dvh,2rem)] pb-[clamp(1.5rem,5.2dvh,3rem)] max-h-[100dvh] overflow-y-auto"
          style={{
            clipPath: open ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
            transition: 'clip-path 0.55s cubic-bezier(0.65, 0, 0.35, 1)',
          }}
        >
          {/* Content fades/drops in a beat after the frame starts revealing (staggered per row),
              rather than just appearing wherever the clip boundary happens to have reached — that
              extra lag is what reads as depth instead of the content being flatly stuck to the frame.
              Link font-size/padding and the header/CTA margins use clamp() tied to dvh rather than a
              fixed size: on a short screen (e.g. a 667px-tall iPhone SE) the fixed sizing used to make
              the whole 7-link list + CTA overflow into an immediate scroll, while the same fixed sizing
              left a tall screen (e.g. 926px) looking spacious and well-proportioned. Scaling with
              viewport height keeps the panel feeling similarly proportioned across both instead of
              only being tuned for one. */}
          <div
            className={`flex items-center justify-between mb-[clamp(1.5rem,4.2dvh,2.5rem)] transition-all duration-[400ms] ease-out ${
              open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
            style={{ transitionDelay: open ? '140ms' : '0ms' }}
          >
            <Logo className="h-7" />
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
                className={`font-display text-[clamp(1.375rem,3.8dvh,1.875rem)] font-semibold text-ink py-[clamp(0.5rem,1.6dvh,0.75rem)] border-b border-divider transition-all duration-[400ms] ease-out ${
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
            className={`mt-[clamp(1rem,3.4dvh,2rem)] magnetic-btn flex items-center justify-center gap-2 bg-primary text-deep px-6 py-[clamp(0.625rem,1.8dvh,1rem)] rounded-full font-semibold w-full transition-all duration-[400ms] ease-out ${
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
