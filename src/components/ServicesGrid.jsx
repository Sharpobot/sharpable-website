import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { SERVICES_FULL } from '../constants.js'

export default function ServicesGrid() {
  const ref = useRef(null)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.svc-tile', {
        scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.06,
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="relative py-24 px-6 sm:px-10 lg:px-16 bg-deep text-white overflow-hidden rounded-t-6xl">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-14">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary">╱ Everything we build</span>
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl mt-4 leading-[1.05] tracking-tight">
              The whole package,
              <span className="block font-serif italic font-medium text-primary text-5xl sm:text-6xl md:text-7xl">under one roof.</span>
            </h2>
          </div>
          <p className="text-white/60 max-w-md text-base leading-relaxed">
            From a single landing page to a full e-commerce build — we handle projects of every size, remotely, worldwide.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 rounded-4xl overflow-hidden">
          {SERVICES_FULL.map((svc, i) => {
            const Icon = svc.icon
            return (
              <div key={i} className="svc-tile group bg-deep p-7 sm:p-9 hover:bg-white/[0.02] transition-colors duration-500 relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-500">
                    <Icon className="h-5 w-5 text-primary group-hover:text-deep" strokeWidth={2} />
                  </div>
                  <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl sm:text-2xl mb-3">{svc.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{svc.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
