import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { useLanguage } from '../useLanguage.js'

const AVATARS = [
  'https://res.cloudinary.com/da3lqh4dl/image/upload/q_auto/f_auto/v1776045660/Export_Stuff_1_30_glivat.png',
  null,
]

const AUTO_ADVANCE_MS = 3000
const TRANSITION_MS = 700
const CARD_GAP = 20

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
  const trackRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(length)
  const [withTransition, setWithTransition] = useState(true)
  const [paused, setPaused] = useState(false)
  const [cardWidth, setCardWidth] = useState(540)

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

  useEffect(() => {
    const updateWidth = () => {
      setCardWidth(window.innerWidth < 640 ? window.innerWidth - 48 : 540)
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    if (paused || length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => i + 1)
      setWithTransition(true)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(id)
  }, [paused, length])

  useEffect(() => {
    if (index >= length * 2) {
      const timeout = setTimeout(() => {
        setWithTransition(false)
        setIndex(index - length)
      }, TRANSITION_MS)
      return () => clearTimeout(timeout)
    }
    if (index <= 0) {
      const timeout = setTimeout(() => {
        setWithTransition(false)
        setIndex(index + length)
      }, TRANSITION_MS)
      return () => clearTimeout(timeout)
    }
  }, [index, length])

  useEffect(() => {
    if (!withTransition && trackRef.current) {
      trackRef.current.getBoundingClientRect()
      requestAnimationFrame(() => setWithTransition(true))
    }
  }, [withTransition])

  const goNext = () => {
    setWithTransition(true)
    setIndex((i) => i + 1)
  }
  const goPrev = () => {
    setWithTransition(true)
    setIndex((i) => i - 1)
  }

  const offset = -(index * (cardWidth + CARD_GAP))

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="relative py-20 sm:py-28 overflow-hidden"
    >
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
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="overflow-x-hidden py-4 -my-4">
            <div
              ref={trackRef}
              className="flex"
              style={{
                gap: `${CARD_GAP}px`,
                transform: `translateX(${offset}px)`,
                transition: withTransition ? `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
              }}
            >
              {items.map((item, i) => {
                const distance = Math.abs(i - index)
                const faded = distance > 1
                return (
                  <div
                    key={i}
                    className="shrink-0 bg-surface border border-divider rounded-4xl px-6 sm:px-8 py-8 shadow-sm"
                    style={{
                      width: cardWidth,
                      opacity: faded ? 0.35 : 1,
                      transform: faded ? 'scale(0.92)' : 'scale(1)',
                      transition: `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
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
          </div>

          <div className="flex items-center gap-3 mt-8 justify-end">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous testimonial"
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-surface border border-divider text-ink flex items-center justify-center hover:border-primary/40 hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next testimonial"
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-surface border border-divider text-ink flex items-center justify-center hover:border-primary/40 hover:text-primary transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
