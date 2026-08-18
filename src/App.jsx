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
import TrustSignals from './components/TrustSignals.jsx'
import ContactForm from './components/ContactForm.jsx'
import Footer from './components/Footer.jsx'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  useEffect(() => {
    const t1 = setTimeout(() => ScrollTrigger.refresh(), 200)
    const t2 = setTimeout(() => ScrollTrigger.refresh(), 1000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
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
        <TrustSignals />
        <ContactForm />
      </main>
      <Footer />
    </div>
  )
}
