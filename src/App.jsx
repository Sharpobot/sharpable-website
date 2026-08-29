import { useEffect, useLayoutEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HOME_SCROLL_KEY } from './scrollRestore.js'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import Pillars from './components/Pillars.jsx'
import Protocol from './components/Protocol.jsx'
import ServicesGrid from './components/ServicesGrid.jsx'
import Work from './components/Work.jsx'
import Transformation from './components/Transformation.jsx'
import Testimonials from './components/Testimonials.jsx'
import TrustSignals from './components/TrustSignals.jsx'
import ContactForm from './components/ContactForm.jsx'
import Footer from './components/Footer.jsx'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  // Whether a scroll position needs restoring is knowable synchronously (sessionStorage, no async
  // work) before the very first render, so the initializer — not an effect — decides the starting
  // visibility. That's what makes the hidden state below actually prevent a flash rather than just
  // shorten one: by the time anything paints, this is already settled.
  const [ready, setReady] = useState(() => sessionStorage.getItem(HOME_SCROLL_KEY) === null)

  // Restores the scroll position Footer.jsx stashed right before navigating to /privacy or /terms —
  // without this, coming back via "Back to home" always lands at the top instead of where the user
  // actually was (this SPA doesn't reset or restore scroll on its own across a route change).
  //
  // This can't just be "scrollTo the saved value once": right after mount the page is still its
  // pre-layout height (GSAP pins unresolved, images unloaded), so an early scrollTo clamps short —
  // same root cause as the ScrollTrigger timing issue below. The previous version retried on a timer
  // and re-applied the position each time, which *worked* but was visibly a jump-to-top-then-jump-to-
  // the-real-spot, since every retry happened after the page had already painted somewhere wrong.
  // This instead keeps the page invisible (reserved layout, nothing painted — `visibility`, not
  // `opacity` or `display`) until two consecutive animation frames report the same document height,
  // then sets scroll and reveals in the same frame — one paint, already in the right place.
  useLayoutEffect(() => {
    if (ready) return

    // The saved value is read (and removed) inside `finish`, not up here, and only whichever
    // invocation actually reaches `finish` touches sessionStorage at all. That matters because
    // StrictMode double-invokes effects in dev (mount → cleanup → mount again) — reading and
    // clearing the key eagerly here meant the throwaway first invocation consumed it before the
    // one that actually lasts ever got a chance to, so the real restore silently fell back to 0.
    let done = false
    const finish = () => {
      if (done) return
      done = true
      const y = Number(sessionStorage.getItem(HOME_SCROLL_KEY)) || 0
      sessionStorage.removeItem(HOME_SCROLL_KEY)
      window.scrollTo({ top: y, behavior: 'instant' })
      setReady(true)
    }

    let cancelled = false
    let lastHeight = -1
    let stableFrames = 0
    const tick = () => {
      if (cancelled || done) return
      const h = document.body.scrollHeight
      stableFrames = h === lastHeight ? stableFrames + 1 : 0
      lastHeight = h
      if (stableFrames >= 3) {
        finish()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    // A setTimeout backstop, not another rAF — rAF can go fully idle on a backgrounded/hidden tab
    // (this exact class of bug already bit the Testimonials carousel's own wrap-correction logic;
    // same fix applies here), so leaving the "never wait forever" guarantee inside the rAF chain
    // itself isn't actually a guarantee — if rAF never ticks again, that deadline check never runs
    // either, and the page would stay invisible indefinitely instead of just imperfectly positioned.
    const fallback = setTimeout(finish, 700)

    return () => {
      cancelled = true
      clearTimeout(fallback)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh()
    const t1 = setTimeout(refresh, 200)
    const t2 = setTimeout(refresh, 1000)
    // Images loading after the timeouts above (slow network, large Cloudinary/Unsplash assets) leave
    // ScrollTrigger's pin/scrub ranges measured against a too-short page — refresh once everything has
    // actually finished loading, not just after a guessed delay.
    window.addEventListener('load', refresh)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('load', refresh)
    }
  }, [])

  return (
    <div className="relative" style={{ visibility: ready ? 'visible' : 'hidden' }}>
      <div className="noise-overlay" />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pillars />
        <Protocol />
        <ServicesGrid />
        <Work />
        <Transformation />
        <Testimonials />
        <TrustSignals />
        <ContactForm />
      </main>
      <Footer />
    </div>
  )
}
