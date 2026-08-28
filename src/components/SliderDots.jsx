/**
 * Shared slider position indicator for Transformation and Testimonials — a segmented
 * story-style bar (à la Instagram) rather than a row of separate dots: segments before
 * the active one are fully filled, the active one fills in (instantly, or animated over
 * `progressMs` for an auto-advancing carousel), and the rest stay empty.
 * Pass `progressMs` + `paused` to get the auto-advance countdown fill (Testimonials);
 * omit them for an instantly-filled indicator (Transformation).
 */
export default function SliderDots({ length, active, onSelect, progressMs, paused, label = 'Go to slide' }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length }).map((_, i) => {
        const isPast = i < active
        const isActive = i === active
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`${label} ${i + 1}`}
            className="relative h-[3px] w-8 sm:w-10 rounded-full overflow-hidden bg-divider"
          >
            {isPast && <span className="absolute inset-0 rounded-full bg-primary-dark" />}
            {isActive && (
              <span
                key={progressMs ? active : 'static'}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary-light"
                style={
                  progressMs
                    ? {
                        animation: `slider-dot-fill ${progressMs}ms linear forwards`,
                        animationPlayState: paused ? 'paused' : 'running',
                      }
                    : { width: '100%' }
                }
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
