import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { useLanguage } from '../useLanguage.js'
import SliderDots from './SliderDots.jsx'

const AVATARS = [
  'https://res.cloudinary.com/da3lqh4dl/image/upload/q_auto/f_auto/v1776045660/Export_Stuff_1_30_glivat.png',
  null,
]

const AUTO_ADVANCE_MS = 7000
const CARD_GAP = 20
const SCROLL_DURATION_MS = 750

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Avatar({ src, name }) {
  const [failed, setFailed] = useState(!src)
  if (failed) {
    return (
      <div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-display font-bold text-sm text-primary-dark shrink-0">
        {initials(name)}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className="h-12 w-12 rounded-full object-cover shrink-0"
    />
  )
}

function Stars() {
  return (
    <div className="flex gap-0.5 mt-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
      ))}
    </div>
  )
}

export default function Testimonials() {
  const { t } = useLanguage()
  const testimonials = t.testimonials.items
  const length = testimonials.length
  const items = [...testimonials, ...testimonials, ...testimonials]

  const sectionRef = useRef(null)
  const containerRef = useRef(null)
  const indexRef = useRef(length)
  const initializedRef = useRef(false)
  const scrollAnimRef = useRef(0)

  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(length)
  const [visualIndex, setVisualIndex] = useState(length)
  const [paused, setPaused] = useState(false)
  const [cardWidth, setCardWidth] = useState(540)
  const [sidePad, setSidePad] = useState(0)

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Measure the scroll viewport and derive a card width that leaves room to peek + fade on both edges.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const cw = el.clientWidth
      const isDesktop = cw >= 640
      const cardW = isDesktop ? Math.round(Math.min(540, cw * 0.62)) : Math.round(Math.max(260, cw - 16))
      setCardWidth(cardW)
      setSidePad(Math.max(0, Math.round((cw - cardW) / 2)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Track which card is nearest the center on every scroll frame (not just once settled) so the
  // active-card highlight (opacity/scale) never lags behind the finger — a lagging highlight is
  // what made the loop-wrap read as a jarring "pop" right as it crossed the seam.
  useEffect(() => {
    const el = containerRef.current
    if (!el || !cardWidth) return
    const unit = cardWidth + CARD_GAP
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        setVisualIndex(Math.round(el.scrollLeft / unit))
      })
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [cardWidth])

  // Instantly move to a scroll offset without the browser's own scroll-snap correction
  // fighting our math and drifting the result onto the neighboring card.
  const jumpTo = (el, left) => {
    cancelAnimationFrame(scrollAnimRef.current)
    el.style.scrollSnapType = 'none'
    el.style.scrollBehavior = 'auto'
    el.scrollLeft = left
    // setTimeout (not rAF) so the reset still runs even if the tab is backgrounded mid-jump.
    setTimeout(() => {
      el.style.scrollSnapType = ''
      el.style.scrollBehavior = ''
    }, 50)
  }

  // Keep the currently-active card centered whenever card sizing changes (resize / orientation change).
  useEffect(() => {
    const el = containerRef.current
    if (!el || !cardWidth) return
    jumpTo(el, indexRef.current * (cardWidth + CARD_GAP))
    initializedRef.current = true
  }, [cardWidth])

  // Custom eased glide (rather than the browser's native "smooth", which is short/abrupt for
  // this distance) — gives full control over duration so the motion reads as a deliberate glide.
  const animateScrollTo = (el, target) => {
    cancelAnimationFrame(scrollAnimRef.current)
    const start = el.scrollLeft
    const distance = target - start
    if (distance === 0) return
    el.style.scrollSnapType = 'none'
    const startTime = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / SCROLL_DURATION_MS)
      el.scrollLeft = start + distance * easeInOutCubic(t)
      if (t < 1) {
        scrollAnimRef.current = requestAnimationFrame(tick)
      } else {
        el.style.scrollSnapType = ''
      }
    }
    scrollAnimRef.current = requestAnimationFrame(tick)
  }

  const step = (dir) => {
    const el = containerRef.current
    if (!el || !cardWidth) return
    const unit = cardWidth + CARD_GAP
    const current = Math.round(el.scrollLeft / unit)
    animateScrollTo(el, (current + dir) * unit)
  }
  const goNext = () => step(1)
  const goPrev = () => step(-1)

  const goToReal = (i) => {
    const el = containerRef.current
    if (!el || !cardWidth) return
    const unit = cardWidth + CARD_GAP
    const current = Math.round(el.scrollLeft / unit)
    const currentThird = Math.floor(current / length)
    animateScrollTo(el, (currentThird * length + i) * unit)
  }

  // Auto-advance every AUTO_ADVANCE_MS, paused while the user is actively pressing/holding the carousel.
  useEffect(() => {
    if (paused || length <= 1 || !cardWidth) return
    const id = setInterval(() => step(1), AUTO_ADVANCE_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `step` closes over cardWidth, already tracked here
  }, [paused, length, cardWidth])

  // Snap tracking + the seamless infinite-loop wrap, resolved once the scroll gesture has actually settled
  // (never mid-swipe) so it never interrupts or visibly jumps under the user's finger.
  //
  // The tripled array exists purely as a deep buffer — correction only fires within one card of the
  // *true* ends of that buffer, not at every crossing into the neighboring copy. Landing back on the
  // "first" or "last" real testimonial (the far more common case) never triggers a jump at all now.
  useEffect(() => {
    const el = containerRef.current
    if (!el || !cardWidth) return
    const unit = cardWidth + CARD_GAP
    const total = length * 3
    let debounceId = null

    const settle = () => {
      const raw = Math.round(el.scrollLeft / unit)
      let next = raw
      if (raw <= 0) next = raw + length
      else if (raw >= total - 1) next = raw - length
      if (next !== raw) {
        jumpTo(el, next * unit)
      }
      setIndex(next)
    }

    // Belt-and-braces: debounce off every 'scroll' as a fallback in case 'scrollend' doesn't fire
    // for a given browser/scroll type, but let a real 'scrollend' resolve immediately and win.
    const onScroll = () => {
      clearTimeout(debounceId)
      debounceId = setTimeout(settle, 120)
    }
    const onScrollEnd = () => {
      clearTimeout(debounceId)
      settle()
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('scrollend', onScrollEnd)
    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('scrollend', onScrollEnd)
      clearTimeout(debounceId)
    }
  }, [cardWidth, length])

  const activeReal = ((visualIndex % length) + length) % length

  const holdHandlers = {
    onPointerDown: () => setPaused(true),
    onPointerUp: () => setPaused(false),
    onPointerCancel: () => setPaused(false),
    onPointerLeave: () => setPaused(false),
  }

  return (
    <section id="testimonials" ref={sectionRef} className="relative py-20 sm:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div
          className={`transition-all duration-1000 ease-out mb-12 sm:mb-16 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">
            ╱ {t.testimonials.eyebrow}
          </span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink mt-4 leading-[1.05] tracking-tight">
            {t.testimonials.heading1}
            <span className="block font-serif italic font-medium text-primary mt-1 text-5xl sm:text-6xl md:text-7xl">
              {t.testimonials.heading2}
            </span>
          </h2>
        </div>

        <div
          className={`transition-all duration-1000 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="relative" {...holdHandlers}>
            <div
              ref={containerRef}
              className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide overscroll-x-contain py-4 -my-4 touch-pan-x"
              style={{
                gap: `${CARD_GAP}px`,
                paddingLeft: sidePad,
                paddingRight: sidePad,
              }}
            >
              {items.map((item, i) => {
                const isActive = i === visualIndex
                return (
                  <div
                    key={i}
                    className="shrink-0 snap-center bg-surface border border-divider rounded-4xl px-6 sm:px-8 py-8 shadow-sm"
                    style={{
                      width: cardWidth,
                      opacity: isActive ? 1 : 0.7,
                      transform: isActive ? 'scale(1)' : 'scale(0.94)',
                      transition: 'opacity 400ms ease, transform 400ms ease',
                    }}
                  >
                    <Quote className="h-7 w-7 text-primary/40" fill="currentColor" strokeWidth={0} />
                    <Stars />
                    <p className="text-ink text-base leading-relaxed mt-4 mb-7">{item.quote}</p>
                    <div className="flex items-center gap-3">
                      <Avatar src={AVATARS[i % length]} name={item.name} />
                      <div>
                        <div className="font-display font-semibold text-sm text-ink">{item.name}</div>
                        <div className="text-xs text-muted">{item.role}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Edge fade as real overlay gradients (not mask-image) — masking a scrollable, wide gradient
                is prone to Chromium compositor banding/tiling artifacts, especially at this width.
                Width matches sidePad exactly so the fade spans the *entire* peeking sliver instead of
                stopping partway and leaving a flatly-dim, hard-edged remainder. */}
            <div
              className="absolute inset-y-0 left-0 z-20 pointer-events-none bg-gradient-to-r from-background to-transparent"
              style={{ width: sidePad }}
            />
            <div
              className="absolute inset-y-0 right-0 z-20 pointer-events-none bg-gradient-to-l from-background to-transparent"
              style={{ width: sidePad }}
            />

            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous testimonial"
              className="hidden sm:flex absolute left-0 sm:-left-2 lg:-left-4 top-1/2 -translate-y-1/2 z-30 h-11 w-11 lg:h-12 lg:w-12 rounded-full bg-surface/90 backdrop-blur-md border border-divider text-ink items-center justify-center hover:border-primary/40 hover:text-primary transition-colors shadow-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next testimonial"
              className="hidden sm:flex absolute right-0 sm:-right-2 lg:-right-4 top-1/2 -translate-y-1/2 z-30 h-11 w-11 lg:h-12 lg:w-12 rounded-full bg-surface/90 backdrop-blur-md border border-divider text-ink items-center justify-center hover:border-primary/40 hover:text-primary transition-colors shadow-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 sm:mt-10">
            <SliderDots
              length={length}
              active={activeReal}
              onSelect={goToReal}
              progressMs={AUTO_ADVANCE_MS}
              paused={paused}
              label="Go to testimonial"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
