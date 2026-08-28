import { useEffect } from 'react'
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
  // Restores the scroll position Footer.jsx stashed right before navigating to /privacy or /terms —
  // without this, coming back via "Back to home" always lands at the top instead of where the user
  // actually was (this SPA doesn't reset or restore scroll on its own across a route change). Retried
  // on the same delays as the ScrollTrigger refresh below rather than once: right after mount the page
  // is still its pre-layout height (GSAP pins unresolved, images unloaded), so an early scrollTo just
  // clamps short against a too-short page — same root cause as the ScrollTrigger timing issue.
  useEffect(() => {
    const savedY = sessionStorage.getItem(HOME_SCROLL_KEY)
    if (savedY === null) return
    sessionStorage.removeItem(HOME_SCROLL_KEY)
    const y = Number(savedY)
    // If the user starts scrolling on their own during the retry window, don't fight them on the
    // next attempt — only reapply while the page is still sitting where the last attempt left it.
    let lastSetY = null
    const restore = () => {
      if (lastSetY !== null && Math.abs(window.scrollY - lastSetY) > 50) return
      window.scrollTo({ top: y, behavior: 'instant' })
      lastSetY = y
    }
    restore()
    const t1 = setTimeout(restore, 200)
    const t2 = setTimeout(restore, 1000)
    window.addEventListener('load', restore)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('load', restore)
    }
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
    <div className="relative">
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
