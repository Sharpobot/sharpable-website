import { useEffect, useRef, useState } from 'react'

// Tuned constants — see CLAUDE.md's "Loading screen" entry before changing any of these; the
// reasoning for each number lives there, not here.
const SHOW_DELAY_MS = 180
const CEILING_PCT = 92
const EASE_DURATION_MS = 900
const FINISH_DURATION_MS = 220
const HOLD_MS = 200
const FADE_MS = 350
// Hard failsafe: if real readiness (`trulyReady` below) never arrives at all — window.load never
// fires because a sub-resource hangs indefinitely, a service worker misbehaves, whatever — this
// forces the same finish-and-reveal sequence anyway. This matters more than it used to: the page
// itself now stays `visibility: hidden` (App.jsx) until this component resolves, so without a bound
// here, a readiness signal that never arrives would leave the entire site permanently invisible,
// not just an overlay stuck spinning on top of an already-visible page. Mirrors the same pattern
// App.jsx's own scroll-restore effect already uses for the identical class of risk (a rAF/event
// chain that could in principle never tick again) — see its `fallback = setTimeout(finish, 700)`.
const MAX_WAIT_MS = 8000

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

// Deliberately no logo/wordmark here (removed on request — "not obnoxious... much smaller and
// more subtle") — just a small track + a percentage readout directly under it. The percentage is
// never a fixed timeline: it eases toward a 92% ceiling while genuinely waiting (never claiming
// "done" before it's true), then only completes to 100% once real readiness says so, then holds
// briefly and fades. `onDone` fires exactly once, whether or not the loader ever actually became
// visible — the app's own entrance animations (see Hero.jsx's `canAnimate` prop) key off it so
// they never run underneath or crossfade with this screen.
//
// `appReady` (App.jsx's own `ready` state) is NOT by itself a general "the page has visually
// loaded" signal — it's narrowly scoped to the scroll-restore case (coming back from a legal
// page) and is already `true` from the very first render on a normal first visit, since there's
// nothing to restore. Using it alone here would mean this screen never shows at all for the exact
// case it's meant for. So readiness here is the AND of two real signals: `appReady` (so we still
// respect scroll-restore correctness on the legal-page-back case) and the browser's own
// `document.readyState`/`load` event (so a normal first visit waits for fonts, stylesheets, and
// every eagerly-loaded image to actually finish, not just React mounting).
export default function LoadingScreen({ appReady, onDone }) {
  const [pageLoaded, setPageLoaded] = useState(
    () => typeof document !== 'undefined' && document.readyState === 'complete'
  )
  const [visible, setVisible] = useState(false)
  const [pct, setPct] = useState(0)
  const [fadingOut, setFadingOut] = useState(false)
  const [mounted, setMounted] = useState(true)

  const trulyReady = pageLoaded && appReady

  const trulyReadyRef = useRef(trulyReady)
  const pctRef = useRef(0)
  const resolvedRef = useRef(false)
  // Every setTimeout this component schedules gets tracked here and cleared as a group on unmount —
  // several of them are nested two levels deep (finish the fill, THEN hold, THEN fade), and clearing
  // only the outer one of a chain like that leaves the inner ones free to fire later and call
  // setState on an already-unmounted instance. Harmless in modern React (state updates on an
  // unmounted component are silently ignored, not an error), but still a real, avoidable leak.
  const timeoutsRef = useRef(new Set())

  const setManagedTimeout = (fn, ms) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id)
      fn()
    }, ms)
    timeoutsRef.current.add(id)
    return id
  }

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach(clearTimeout)
      timeouts.clear()
    }
  }, [])

  // Refs are updated in an effect (after render/commit), not in the render body itself — mutating
  // a ref during render is unsafe under concurrent rendering, since a render can be discarded and
  // retried before it commits.
  useEffect(() => {
    trulyReadyRef.current = trulyReady
  }, [trulyReady])
  useEffect(() => {
    pctRef.current = pct
  }, [pct])

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const resolve = () => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    onDone()
  }

  // Forces the same finish-and-reveal sequence real readiness would have triggered — used by the
  // hard failsafe below, and safe to call from anywhere since `resolve()` itself is idempotent.
  const forceFinish = () => {
    if (resolvedRef.current) return
    setPct(100)
    setFadingOut(true)
    setManagedTimeout(() => {
      setMounted(false)
      resolve()
    }, FADE_MS)
  }

  // The real browser-load half of readiness.
  useEffect(() => {
    if (pageLoaded) return
    const onLoad = () => setPageLoaded(true)
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [pageLoaded])

  // Respect prefers-reduced-motion by skipping the treatment entirely — matches how the rest of
  // the site (Hero shader, legal-page transitions) already handles it, and preserves today's
  // behavior (entrance animations fire immediately) for anyone with the preference set.
  useEffect(() => {
    if (reducedMotion) resolve()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hard failsafe — see MAX_WAIT_MS above. Independent of every other effect here, and of whether
  // the loader ever became visible, so a hang in any of them still can't leave the page hidden
  // forever.
  useEffect(() => {
    if (reducedMotion) return
    const timer = setManagedTimeout(forceFinish, MAX_WAIT_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Never flash anything for a wait shorter than SHOW_DELAY_MS — per the research this was built
  // from, an indicator for a sub-~200ms wait is pure noise, not information.
  useEffect(() => {
    if (reducedMotion) return
    const timer = setManagedTimeout(() => {
      if (!trulyReadyRef.current) setVisible(true)
    }, SHOW_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Eases toward the ceiling while genuinely still waiting. Stops reading the ref once readiness
  // flips — the finish effect below takes over from wherever this left off.
  useEffect(() => {
    if (reducedMotion || !visible) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      if (trulyReadyRef.current) return
      const t = Math.min((now - start) / EASE_DURATION_MS, 1)
      setPct(Math.round(easeOutCubic(t) * CEILING_PCT))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Real readiness (both halves true). Two paths: the loader never got shown (fast load — resolve
  // right away, nothing to clean up), or it did — finish the fill from wherever it stalled, hold
  // at 100% just long enough to register, fade, unmount, then resolve.
  useEffect(() => {
    if (!trulyReady || reducedMotion) return
    if (!visible) {
      resolve()
      return
    }
    let raf
    const from = pctRef.current
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / FINISH_DURATION_MS, 1)
      setPct(Math.round(from + (100 - from) * easeOutCubic(t)))
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setManagedTimeout(() => {
          setFadingOut(true)
          setManagedTimeout(() => {
            setMounted(false)
            resolve()
          }, FADE_MS)
        }, HOLD_MS)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trulyReady, visible])

  if (reducedMotion || !visible || !mounted) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-2 pointer-events-none transition-opacity"
      style={{ opacity: fadingOut ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
      // `role="status"`/`aria-live="polite"` so assistive tech gets *some* signal a load is in
      // progress — previously nothing here announced anything. The fast-changing percentage stays
      // `aria-hidden` (a screen reader re-announcing a new number several times a second would be
      // pure noise); the one thing actually announced is a static, unchanging label, spoken once
      // when this first mounts and never repeated.
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      <div className="w-36 h-[3px] rounded-full bg-divider/50 overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-sm tracking-wide text-muted tabular-nums" aria-hidden="true">{pct}%</span>
    </div>
  )
}
