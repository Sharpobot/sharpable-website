import { useRef, useState } from 'react'
import { ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../useLanguage.js'

/* Abstract "before/after" mockups — no real client photos, just an
   honest illustrative contrast between a generic layout and a
   Sharpable-style one. */
function TransformMockup({ variant }) {
  if (variant === 'after') {
    return (
      <div className="absolute inset-0 bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-1.5 mb-5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/15" />
        </div>
        <div className="h-6 w-2/3 rounded-full bg-primary/30 mb-4" />
        <div className="h-2.5 w-5/6 rounded-full bg-divider mb-2" />
        <div className="h-2.5 w-2/3 rounded-full bg-divider mb-6" />
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="aspect-square rounded-xl bg-background border border-divider" />
          <div className="aspect-square rounded-xl bg-background border border-divider" />
          <div className="aspect-square rounded-xl bg-background border border-divider" />
        </div>
        <div className="h-9 w-32 rounded-full bg-primary" />
      </div>
    )
  }
  return (
    <div className="absolute inset-0 bg-[#EAEAEA] p-6 sm:p-8">
      <div className="h-4 w-1/2 bg-[#B4B4B4] mb-5" />
      <div className="h-2 w-full bg-[#C9C9C9] mb-2" />
      <div className="h-2 w-5/6 bg-[#C9C9C9] mb-2" />
      <div className="h-2 w-2/3 bg-[#C9C9C9] mb-6" />
      <div className="h-20 sm:h-24 w-full bg-[#D6D6D6] mb-6" />
      <div className="h-8 w-28 bg-[#B4B4B4]" />
    </div>
  )
}

function TransformCard({ card, position, flipped, onFlip, before, after }) {
  const [pos, setPos] = useState(50)
  const buttonRef = useRef(null)
  const lockedRef = useRef(true)

  const isNearButton = (clientX, clientY) => {
    if (!buttonRef.current) return false
    const rect = buttonRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return Math.hypot(clientX - cx, clientY - cy) < 36
  }

  const posClasses = {
    center: 'translate-x-0 scale-100 z-20 opacity-100 blur-0 pointer-events-auto',
    left: '-translate-x-[62%] sm:-translate-x-[58%] scale-[0.82] z-10 opacity-100 blur-[3px] pointer-events-none',
    right: 'translate-x-[62%] sm:translate-x-[58%] scale-[0.82] z-10 opacity-100 blur-[3px] pointer-events-none',
    hidden: 'translate-x-0 scale-[0.82] z-0 opacity-0 pointer-events-none',
  }

  return (
    <div
      className={`absolute inset-0 transition-all duration-500 ease-out ${posClasses[position]}`}
      style={{ willChange: 'transform, opacity' }}
    >
      <div
        className="relative w-full h-full [transform-style:preserve-3d] transition-transform duration-700"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front: before/after slider */}
        <div
          className="absolute inset-0 [backface-visibility:hidden] rounded-3xl overflow-hidden border border-divider bg-surface cursor-pointer"
          onClick={() => position === 'center' && onFlip()}
        >
          <TransformMockup variant="after" />
          <div className="absolute inset-0" style={{ clipPath: `polygon(0 0, ${pos}% 0, ${pos}% 100%, 0 100%)` }}>
            <TransformMockup variant="before" />
          </div>
          <div
            className="absolute top-0 bottom-0 w-[3px] bg-primary pointer-events-none"
            style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
          />
          <div
            ref={buttonRef}
            className="absolute top-1/2 h-11 w-11 rounded-full bg-primary text-deep flex items-center justify-center shadow-lg pointer-events-none"
            style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <ArrowLeftRight className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            aria-label="Before / after comparison slider"
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize m-0"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              lockedRef.current = !isNearButton(e.clientX, e.clientY)
            }}
            onTouchStart={(e) => {
              const t = e.touches[0]
              lockedRef.current = !isNearButton(t.clientX, t.clientY)
            }}
            onMouseUp={() => {
              lockedRef.current = true
            }}
            onTouchEnd={() => {
              lockedRef.current = true
            }}
            onChange={(e) => {
              if (!lockedRef.current) setPos(Number(e.target.value))
            }}
          />
          <span className="absolute top-3 sm:top-4 left-3 sm:left-4 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-white bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full pointer-events-none">
            {before}
          </span>
          <span className="absolute top-3 sm:top-4 right-3 sm:right-4 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-white bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full pointer-events-none">
            {after}
          </span>
        </div>

        {/* Back: flip reveal */}
        <div
          className="absolute inset-0 [backface-visibility:hidden] rounded-3xl overflow-hidden border border-divider bg-surface flex flex-col items-center justify-center gap-4 p-8 sm:p-10 text-center cursor-pointer"
          style={{ transform: 'rotateY(180deg)' }}
          onClick={() => position === 'center' && onFlip()}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary-dark bg-primary/10 px-2.5 py-1 rounded-full">
            {card.tag}
          </span>
          <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink leading-tight">{card.title}</h3>
          <p className="text-muted text-sm sm:text-base leading-relaxed max-w-sm">{card.text}</p>
          <a
            href="#contact"
            onClick={(e) => e.stopPropagation()}
            className="magnetic-btn inline-flex items-center gap-2 bg-primary text-deep font-semibold px-6 py-3 rounded-full shadow-lg shadow-primary/30 mt-1"
          >
            {card.cta}
          </a>
        </div>
      </div>
    </div>
  )
}

export default function Transformation() {
  const { t } = useLanguage()
  const cards = t.transformation.cards
  const total = cards.length

  const [index, setIndex] = useState(total > 2 ? 1 : 0)
  const [flipped, setFlipped] = useState(() => Array(total).fill(false))
  const touchStartX = useRef(0)

  const goTo = (i) => {
    setIndex(((i % total) + total) % total)
    setFlipped(Array(total).fill(false))
  }
  const next = () => goTo(index + 1)
  const prev = () => goTo(index - 1)
  const toggleFlip = (i) => setFlipped((prev) => prev.map((f, idx) => (idx === i ? !f : f)))

  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX
  }
  const onTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].screenX
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev()
    }
  }

  return (
    <section id="transformation" className="relative py-28 sm:py-40 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-16 sm:mb-20 text-center mx-auto">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">
            ╱ {t.transformation.eyebrow}
          </span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink mt-4 leading-[1.05] tracking-tight">
            {t.transformation.heading1}
            <span className="block font-serif italic font-medium text-primary mt-1 text-5xl sm:text-6xl md:text-7xl">
              {t.transformation.heading2}
            </span>
          </h2>
          <p className="text-muted text-base sm:text-lg mt-6 leading-relaxed max-w-xl mx-auto">
            {t.transformation.sub}
          </p>
        </div>

        <div className="relative flex items-center justify-center gap-2 sm:gap-4">
          <button
            onClick={prev}
            aria-label="Previous"
            className="shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-surface border border-divider text-ink flex items-center justify-center hover:border-primary/40 hover:text-primary transition-colors z-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="relative w-full max-w-[280px] sm:max-w-[520px] lg:max-w-[720px] aspect-[4/3] sm:aspect-[16/10] [perspective:1200px]"
          >
            {cards.map((card, i) => {
              const rel = (i - index + total) % total
              const position = rel === 0 ? 'center' : rel === 1 ? 'right' : rel === total - 1 ? 'left' : 'hidden'
              return (
                <TransformCard
                  key={i}
                  card={card}
                  position={position}
                  flipped={flipped[i]}
                  onFlip={() => toggleFlip(i)}
                  before={t.transformation.before}
                  after={t.transformation.after}
                />
              )
            })}
          </div>

          <button
            onClick={next}
            aria-label="Next"
            className="shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-surface border border-divider text-ink flex items-center justify-center hover:border-primary/40 hover:text-primary transition-colors z-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-10">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? 'w-7 bg-primary' : 'w-2 bg-divider hover:bg-muted'
              }`}
            />
          ))}
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted mt-6">
          {t.transformation.hint}
        </p>
      </div>
    </section>
  )
}
