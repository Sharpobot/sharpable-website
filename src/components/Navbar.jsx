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
    { label: t.nav.testimonials, href: '#testimonials' },
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
            {/* The wordmark's "p" descender pulls the letterforms' optical center above the image's
                own geometric center (the trimmed bounding box includes that descender's empty space
                below the baseline, which nothing above it balances out) — reads as sitting slightly
                too high against the nav links/buttons beside it, which don't have that asymmetry. A
                small downward nudge, scoped to just this navbar-scale usage. */}
            <Logo className="h-6 translate-y-[2px]" />
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

      {/* Mobile menu — "Editorial Index": a full-screen takeover (scale+fade in from its own resting
          size, not a panel sliding over the page) rather than the old frame-drop-from-the-top-edge
          reveal, picked from the Mobile Menu Concepts exploration gallery. Numbered rows (the numbers
          are real — they're each link's actual position in the page, not decoration) replace the
          plain list, and the graphic mark appears once, huge and barely-there, as a background
          watermark instead of a small header logo — see the `mono` Logo variant above for why it's
          recolored to a neutral tone instead of staying gold. Because the panel is fully opaque and
          covers the entire screen (including the navbar's own hamburger-turned-X, which sits at a
          lower z-index and gets visually covered once this opens), it needs its own explicit close
          button — the exact bug this exploration's gallery hit and fixed, ported straight into the
          real implementation rather than rediscovering it here. */}
      <div
        ref={menuRef}
        className={`fixed inset-0 z-[60] lg:hidden will-change-transform ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div
          className={`absolute inset-0 bg-background overflow-hidden transition-[opacity,transform] duration-[450ms] ease-out ${
            open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[0.97] pointer-events-none'
          }`}
        >
          {/* Background watermark: sized off viewport width (not height) so it scales down cleanly on
              narrow phones without needing its own dvh clamp — it's purely decorative and doesn't
              consume any of the vertical budget the content below is fighting for. `text-white/[0.035]`
              (nudged down from an initial 0.06 on request — "a little more subtle") rather than any of
              the site's real gold tokens is the "cemented in stone" ask — a plain lightness difference
              against the dark background reads as carved texture, not a brand color trying to be noticed.
              Position restored to the original -14%/-8% corner offset (a further push tried once read
              as "too shoved" per feedback) — only the size is trimmed down from the original 68vw/380px. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-[14%] -bottom-[8%] w-[60vw] max-w-[340px] text-white/[0.035]"
          >
            <Logo iconOnly mono alt="" className="w-full" />
          </div>

          {/* Positioned to land almost exactly where the hamburger-turned-X sits in the navbar itself
              (measured via getBoundingClientRect: ~26px from the top, ~24px from the right, at every
              scroll state) rather than a separately-eyeballed corner offset — so opening/closing the
              menu doesn't read as the close control jumping to a different spot than the button that
              opened it. */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className={`absolute top-[26px] right-6 z-10 p-2 rounded-full bg-divider/40 transition-all duration-300 ease-out ${
              open ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
            style={{ transitionDelay: open ? '120ms' : '0ms' }}
          >
            <X className="h-5 w-5 text-ink" />
          </button>

          {/* Vertically centers the link list + CTA as one group in the available height (rather than
              anchoring it near the top, which read as "too high up" against the close button sitting
              well above it) — `min-h-full` on the inner flex column is what lets `justify-center` work
              at all inside a scrollable ancestor, and the scroll/overflow stays as a fallback for any
              screen too short to fit everything centered, not the primary layout mechanism. */}
          <div className="relative z-[1] h-full overflow-y-auto px-6">
            <div className="min-h-full flex flex-col justify-center py-[clamp(4rem,14dvh,5rem)]">
              <div className="flex flex-col">
                {NAV_LINKS.map((link, i) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-baseline gap-3 py-[clamp(0.45rem,1.7dvh,0.85rem)] border-b border-divider transition-all duration-[500ms] ease-out ${
                      open ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                    }`}
                    style={{ transitionDelay: open ? `${140 + i * 45}ms` : '0ms' }}
                  >
                    <span className="font-mono text-[clamp(0.68rem,1.7dvh,0.85rem)] text-primary-dark">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display font-semibold text-[clamp(1.2rem,3.35dvh,1.875rem)] text-ink">
                      {link.label}
                    </span>
                  </a>
                ))}
              </div>
              <a
                href="#contact"
                onClick={() => setOpen(false)}
                className={`mt-[clamp(1rem,3.4dvh,2rem)] magnetic-btn flex items-center justify-center gap-2 bg-primary text-deep px-6 py-[clamp(0.5rem,1.6dvh,1rem)] rounded-full font-semibold w-full transition-all duration-[500ms] ease-out ${
                  open ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                }`}
                style={{ transitionDelay: open ? `${140 + NAV_LINKS.length * 45 + 40}ms` : '0ms' }}
              >
                {t.nav.cta}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
