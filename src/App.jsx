import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
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
