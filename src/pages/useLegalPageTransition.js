import { useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// A route change in this SPA doesn't animate or reset scroll on its own, and React Router unmounts
// the page immediately on navigation — with no way to animate an "exit" after the fact. So closing
// is faked: play the fade-down first, then actually navigate once it's finished. Kept in sync with
// the .animate-page-out duration in index.css.
const EXIT_DURATION_MS = 320

export function useLegalPageTransition() {
  const [closing, setClosing] = useState(false)
  const navigate = useNavigate()

  // useLayoutEffect (not useEffect) matters here: it runs synchronously before the browser paints,
  // so the scroll position is already 0 by the time anything is shown. useEffect runs *after* paint
  // — the browser would already have shown one frame at whatever scroll position carried over from
  // the previous route (clamped against this much shorter page, usually landing near its bottom)
  // before jumping to the top. `behavior: 'instant'` matters just as much as the timing does: the
  // legacy `scrollTo(0, 0)` form is equivalent to `behavior: 'auto'`, which defers to this project's
  // global `html { scroll-behavior: smooth }` — so even with the effect timing fixed, it was still
  // *animating* up to the top over a couple hundred ms, reading exactly as "scrolls up briefly"
  // rather than a snap. Confirmed via requestAnimationFrame polling: with the plain 2-arg form,
  // scrollY was still mid-flight (~14000 then ~650) several frames after the route had already
  // changed; with `behavior: 'instant'` it's 0 on the very first painted frame.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  const handleBack = (e) => {
    e.preventDefault()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate('/')
      return
    }
    setClosing(true)
    setTimeout(() => navigate('/'), EXIT_DURATION_MS)
  }

  return { pageClassName: closing ? 'animate-page-out' : 'animate-page-in', handleBack }
}
