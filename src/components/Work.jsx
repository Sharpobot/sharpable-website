import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ArrowRight } from 'lucide-react'
import WorkPreview from './WorkPreview.jsx'

export default function Work() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.work-heading > *', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 90%', once: true },
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,
      })
      gsap.utils.toArray('.work-row').forEach((row, i) => {
        gsap.from(row.querySelector('.work-preview'), {
          scrollTrigger: { trigger: row, start: 'top 85%', once: true },
          x: i % 2 === 0 ? -36 : 36,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
        })
        gsap.from(row.querySelector('.work-copy'), {
          scrollTrigger: { trigger: row, start: 'top 85%', once: true },
          y: 24,
          opacity: 0,
          duration: 0.8,
          delay: 0.15,
          ease: 'power3.out',
        })
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const projects = [
    {
      tag: 'Landing Page',
      title: 'Local Bakery Rebrand',
      blurb:
        "A clean, fast-loading site built around daily online orders and custom cake requests — simple to update, easy to browse on a phone.",
      layout: 'list',
    },
    {
      tag: 'Booking Site',
      title: 'Boutique Fitness Studio',
      blurb:
        'Class schedules and membership signup built directly into the site, so customers never have to leave to book a spot.',
      layout: 'grid',
    },
  ]

  return (
    <section id="work" ref={sectionRef} className="relative py-28 sm:py-40 px-6 sm:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="work-heading max-w-3xl mb-16 sm:mb-24">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">
            ╱ Selected work
          </span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink mt-4 leading-[1.05] tracking-tight">
            Sites we've
            <span className="block font-serif italic font-medium text-primary-dark mt-1 text-5xl sm:text-6xl md:text-7xl">
              shipped.
            </span>
          </h2>
        </div>

        <div className="space-y-20 sm:space-y-28">
          {projects.map((p, i) => (
            <div
              key={p.title}
              className="work-row grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
            >
              <div className={`work-preview ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <WorkPreview layout={p.layout} />
              </div>
              <div className="work-copy">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary-dark bg-primary/10 px-2.5 py-1 rounded-full">
                  {p.tag}
                </span>
                <h3 className="font-display font-bold text-3xl sm:text-4xl text-ink leading-tight mt-5">
                  {p.title}
                </h3>
                <p className="text-muted text-base sm:text-lg mt-4 leading-relaxed max-w-md">
                  {p.blurb}
                </p>
                <a
                  href="#contact"
                  className="lift-on-hover inline-flex items-center gap-2 text-ink font-semibold mt-7 group"
                >
                  Want something like this?
                  <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
