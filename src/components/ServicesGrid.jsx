import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useLanguage } from '../useLanguage.js'
import { SERVICE_ICONS } from '../constants.js'

export default function ServicesGrid() {
  const { t } = useLanguage()
  const ref = useRef(null)
  const journeyItemRefs = useRef([])
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.svc-tile', {
        scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.06,
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  // Mobile "journey" spine: continuously draws/undraws as the viewport midpoint travels through
  // each item, and fades its text in/out with it — reversible, not a one-shot reveal. Ported from
  // Aidid-Marcello/aididitmyway-website's Journey section (same technique, our own tokens/copy).
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const items = journeyItemRefs.current.filter(Boolean)
    if (!items.length) return

    if (reducedMotion) {
      items.forEach((item) => {
        item.style.setProperty('--jline-progress', '1')
        item.style.setProperty('--jtext-opacity', '1')
      })
      return
    }

    let ticking = false
    const update = () => {
      ticking = false
      if (window.innerWidth >= 640) return
      const midY = window.innerHeight / 2

      items.forEach((item, i) => {
        const isLast = i === items.length - 1
        const indexEl = item.querySelector('.svc-journey-index')
        const itemRect = item.getBoundingClientRect()
        let lineProgress = 1

        if (!isLast && indexEl) {
          const segStart = indexEl.getBoundingClientRect().bottom
          const segEnd = itemRect.bottom
          const segLength = segEnd - segStart
          lineProgress = segLength > 0 ? (midY - segStart) / segLength : 0
          lineProgress = Math.max(0, Math.min(1, lineProgress))
        }

        // Text becomes fully visible well before the line finishes drawing.
        const textStart = itemRect.top
        let textProgress = (midY - textStart + 40) / 90
        textProgress = Math.max(0.15, Math.min(1, textProgress))

        item.style.setProperty('--jline-progress', lineProgress.toFixed(3))
        item.style.setProperty('--jtext-opacity', textProgress.toFixed(3))
      })
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Fixed-length list (6 services, never changes at runtime), so the ref array can just be
  // overwritten in place each render rather than reset — no stale entries to worry about.
  const items = t.servicesGrid.items.map((item, i) => ({ ...item, icon: SERVICE_ICONS[i] }))

  return (
    <section ref={ref} className="relative py-24 px-6 sm:px-10 lg:px-16 bg-deep text-white rounded-t-6xl">
      <style>{`
        .svc-journey-item { position: relative; }
        .svc-journey-item::before,
        .svc-journey-item::after {
          content: '';
          position: absolute;
          left: calc(2.5rem - 1px);
          top: calc(1.6rem + 2.6rem);
          bottom: 0;
          width: 2px;
        }
        .svc-journey-item::before { background: rgba(255,255,255,0.1); }
        .svc-journey-item::after {
          background: #FFC629;
          transform-origin: top;
          transform: scaleY(var(--jline-progress, 0));
          transition: transform 0.09s linear;
        }
        .svc-journey-item:last-child::before,
        .svc-journey-item:last-child::after { display: none; }
        .svc-journey-item > * {
          opacity: var(--jtext-opacity, 0.15);
          transform: translateY(calc((1 - var(--jtext-opacity, 0.15)) * 12px));
          transition: opacity 0.09s linear, transform 0.09s linear;
        }
        @media (prefers-reduced-motion: reduce) {
          .svc-journey-item > * { opacity: 1 !important; transform: none !important; transition: none !important; }
          .svc-journey-item::after { transform: scaleY(1) !important; }
        }
      `}</style>
      {/* Clipped in its own layer (not on the section itself) — `position: sticky` inside the
          mobile journey list below needs the section to NOT be an overflow-hidden ancestor, or
          sticky resolves against this box instead of the real viewport and never actually sticks. */}
      <div className="absolute inset-0 overflow-hidden rounded-t-6xl pointer-events-none">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-14">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary">╱ {t.servicesGrid.eyebrow}</span>
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl mt-4 leading-[1.05] tracking-tight">
              {t.servicesGrid.heading1}
              <span className="block font-serif italic font-medium text-primary text-5xl sm:text-6xl md:text-7xl">{t.servicesGrid.heading2}</span>
            </h2>
          </div>
          <p className="text-white/60 max-w-md text-base leading-relaxed">
            {t.servicesGrid.sub}
          </p>
        </div>

        {/* Desktop / tablet — unchanged tile grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 rounded-4xl overflow-hidden">
          {items.map((svc, i) => {
            const Icon = svc.icon
            return (
              <div key={i} className="svc-tile group bg-deep p-7 sm:p-9 hover:bg-white/[0.02] transition-colors duration-500 relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-500">
                    <Icon className="h-5 w-5 text-primary group-hover:text-deep" strokeWidth={2} />
                  </div>
                  <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl sm:text-2xl mb-3">{svc.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{svc.text}</p>
              </div>
            )
          })}
        </div>

        {/* Mobile — scroll-driven "journey" list: a spine draws downward as each service scrolls
            through the middle of the screen (and undraws on scroll back up), text fading in with it.
            Static/inert-looking sections don't need interaction to feel alive; this one always does. */}
        <div className="sm:hidden relative">
          <ol className="pb-[3rem]">
            {items.map((svc, i) => (
              <li
                key={i}
                ref={(el) => (journeyItemRefs.current[i] = el)}
                className="svc-journey-item grid grid-cols-[5rem_1fr] gap-[1.4rem] py-[1.6rem]"
              >
                <span className="svc-journey-index font-serif italic font-medium text-2xl text-primary leading-tight text-center pt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display font-bold text-lg text-white mb-1.5 leading-tight">{svc.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{svc.text}</p>
                </div>
              </li>
            ))}
          </ol>
          {/* -mx-6 breaks this out of the section's own px-6 mobile padding so it fades the full
              screen width — including the side gutters where the section's ambient grid pattern
              lives, which would otherwise sit right next to the fade unfaded, as a visible seam
              right where the fade is supposed to be seamless. (percentage-based left/transform
              centering was tried first but resolves unpredictably on a sticky element — this
              margin approach is exact since the padding it's undoing is a known, fixed value.) */}
          <div
            className="sticky bottom-0 -mx-6 -mt-[3rem] h-[3rem] pointer-events-none z-[2]"
            style={{ background: 'linear-gradient(to bottom, rgba(15,15,18,0) 0%, rgba(15,15,18,0) 45%, #0F0F12 100%)' }}
          />
        </div>
      </div>
    </section>
  )
}
