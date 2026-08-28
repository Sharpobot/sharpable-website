import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useLanguage } from '../useLanguage.js'
import { SERVICE_ICONS } from '../constants.js'

export default function ServicesGrid() {
  const { t } = useLanguage()
  const ref = useRef(null)
  const journeyItemRefs = useRef([])
  const journeyWrapRef = useRef(null)
  const spineTrackRef = useRef(null)
  const spineFillRef = useRef(null)
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

  // Mobile "journey" spine: ONE continuous line spans from the first node's center to the last
  // node's center (measured, not guessed — text length varies per language/translation), threading
  // behind each circle so the circle itself masks the overlap and the line reads as fully connected
  // rather than a series of separate segments. A single overall scroll progress (0→1 across the
  // whole span) drives the gold fill; each node's own --jnode-active is a soft threshold around its
  // own center so its circle/connector light up right as the line reaches it.
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const items = journeyItemRefs.current.filter(Boolean)
    if (!items.length) return

    let ticking = false
    const update = () => {
      ticking = false
      if (window.innerWidth >= 640) return
      const midY = reducedMotion ? Infinity : window.innerHeight / 2
      const wrap = journeyWrapRef.current
      if (!wrap) return
      const wrapTop = wrap.getBoundingClientRect().top

      const centers = items.map((item) => {
        const idx = item.querySelector('.svc-journey-index')
        const r = idx.getBoundingClientRect()
        return r.top + r.height / 2
      })
      const firstCenter = centers[0]
      const lastCenter = centers[centers.length - 1]
      const spanLength = lastCenter - firstCenter

      if (spineTrackRef.current && spineFillRef.current) {
        const wrapLeft = wrap.getBoundingClientRect().left
        const firstNotchRect = items[0].querySelector('.svc-journey-index').getBoundingClientRect()
        const leftPx = firstNotchRect.left + firstNotchRect.width / 2 - wrapLeft
        const topPx = firstCenter - wrapTop
        spineTrackRef.current.style.left = `${leftPx}px`
        spineTrackRef.current.style.top = `${topPx}px`
        spineTrackRef.current.style.height = `${spanLength}px`
        spineFillRef.current.style.left = `${leftPx}px`
        spineFillRef.current.style.top = `${topPx}px`
        spineFillRef.current.style.height = `${spanLength}px`
        const spineProgress = spanLength > 0 ? Math.max(0, Math.min(1, (midY - firstCenter) / spanLength)) : 0
        spineFillRef.current.style.transform = `translateX(-50%) scaleY(${spineProgress.toFixed(3)})`
      }

      items.forEach((item, i) => {
        let active = (midY - centers[i]) / 40 + 0.5
        active = Math.max(0, Math.min(1, active))

        const itemRect = item.getBoundingClientRect()
        const textStart = itemRect.top
        let textProgress = (midY - textStart + 40) / 90
        textProgress = Math.max(0.15, Math.min(1, textProgress))

        item.style.setProperty('--jnode-active', active.toFixed(3))
        item.style.setProperty('--jtext-opacity', textProgress.toFixed(3))

        // The chevron is positioned from the notch's own measured center rather than trusted to
        // land there via matching grid/flex box heights across separate elements — that assumption
        // is exactly what caused the earlier connector misalignment bug. (The number stays aligned
        // to the notch "for free" since they're siblings in the same flex row.)
        const chevron = item.querySelector('.svc-journey-chevron')
        if (chevron) chevron.style.top = `${centers[i] - itemRect.top}px`
      })
    }

    if (reducedMotion) {
      update()
      return
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
        .svc-journey-text {
          opacity: var(--jtext-opacity, 0.15);
          transform: translateY(calc((1 - var(--jtext-opacity, 0.15)) * 12px));
          transition: opacity 0.09s linear, transform 0.09s linear;
        }
        /* The marker row and chevron rise into place in lockstep with the title (same var, same
           12px reveal distance) instead of sitting statically while only the title animates — that
           mismatch was exactly why they only looked aligned once a title finished settling. */
        .svc-journey-marker-row {
          transform: translateY(calc((1 - var(--jtext-opacity, 0.15)) * 12px));
          transition: transform 0.09s linear;
        }
        .svc-journey-index {
          z-index: 1;
        }
        .svc-journey-index-fill,
        .svc-journey-num-fill,
        .svc-journey-chevron-fill {
          opacity: var(--jnode-active, 0);
          transition: opacity 0.15s linear;
        }
        .svc-journey-chevron {
          transform: translate(-50%, calc(-50% + (1 - var(--jtext-opacity, 0.15)) * 12px));
          transition: transform 0.09s linear;
        }
        @media (prefers-reduced-motion: reduce) {
          .svc-journey-text,
          .svc-journey-marker-row { opacity: 1 !important; transform: none !important; transition: none !important; }
          .svc-journey-chevron { transform: translate(-50%, -50%) !important; transition: none !important; }
          .svc-journey-index-fill,
          .svc-journey-num-fill,
          .svc-journey-chevron-fill { opacity: 1 !important; }
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

        {/* Mobile — scroll-driven "journey" list: one continuous spine threads through every node,
            drawing/undrawing as each service scrolls through the middle of the screen (and reversing
            on scroll back up), with the node circle and its connector to the title lighting up gold
            as the line reaches it. Static/inert-looking sections don't need interaction to feel
            alive; this one always does. */}
        <div ref={journeyWrapRef} className="sm:hidden relative">
          <span ref={spineTrackRef} className="absolute -translate-x-1/2 w-[2px] bg-white/10 pointer-events-none" />
          <span
            ref={spineFillRef}
            className="absolute w-[2px] bg-primary pointer-events-none origin-top"
            style={{ transform: 'translateX(-50%) scaleY(0)' }}
          />
          <ol>
            {items.map((svc, i) => {
              const num = String(i + 1).padStart(2, '0')
              return (
                <li
                  key={i}
                  ref={(el) => (journeyItemRefs.current[i] = el)}
                  className="relative grid grid-cols-[4rem_1.1rem_1fr] py-[1.6rem]"
                >
                  {/* Number + notch live in the same flex row so they stay aligned to each other by
                      construction (flex align-items, not two independently-sized boxes trusted to
                      land on the same pixel — that assumption is exactly what broke the connector
                      before). The middle column is just a reserved gap; the chevron inside it is
                      positioned from the notch's own measured center, same reasoning as the spine. */}
                  <div className="svc-journey-marker-row flex h-[14px] items-center gap-2 mt-0.5">
                    <span className="relative w-6 shrink-0 text-right font-mono text-[11px] tracking-widest text-white/35">
                      <span className="svc-journey-num-fill absolute inset-0 text-primary">{num}</span>
                      <span className="relative">{num}</span>
                    </span>
                    <span className="svc-journey-index relative h-[13px] w-[13px] shrink-0 rotate-45 rounded-[2px] border-2 border-white/20 bg-deep overflow-hidden">
                      <span className="svc-journey-index-fill absolute inset-0 rounded-[2px] bg-primary" />
                    </span>
                  </div>
                  <div />
                  <div className="svc-journey-text">
                    <h3 className="font-display font-bold text-lg text-white mb-1.5 leading-tight">{svc.title}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{svc.text}</p>
                  </div>
                  <span className="svc-journey-chevron absolute left-[4.55rem] text-white/25 text-base leading-none pointer-events-none">
                    <span className="svc-journey-chevron-fill absolute inset-0 text-primary">&rsaquo;</span>
                    <span className="relative">&rsaquo;</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
