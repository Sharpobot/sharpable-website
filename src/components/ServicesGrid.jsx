import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '../useLanguage.js'
import { SERVICE_ICONS } from '../constants.js'

export default function ServicesGrid() {
  const { t } = useLanguage()
  const ref = useRef(null)
  const [openIndex, setOpenIndex] = useState(null)
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

  const items = t.servicesGrid.items.map((item, i) => ({ ...item, icon: SERVICE_ICONS[i] }))

  return (
    <section ref={ref} className="relative py-24 px-6 sm:px-10 lg:px-16 bg-deep text-white overflow-hidden rounded-t-6xl">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-14">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary">╱ {t.servicesGrid.eyebrow}</span>
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl mt-4 leading-[1.05] tracking-tight">
              {t.servicesGrid.heading1}
              <span className="block font-serif italic font-medium text-primary text-5xl sm:text-6xl md:text-7xl">{t.servicesGrid.heading2}</span>
            </h2>
          </div>
          <p className="text-white/60 max-w-md text-base leading-relaxed">
            {t.servicesGrid.sub}
          </p>
        </div>

        {/* Desktop / tablet — unchanged tile grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 rounded-4xl overflow-hidden">
          {items.map((svc, i) => {
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

        {/* Mobile — compact connecting-rail list, collapsed by default, tap to reveal detail.
            The rail and each row's dot are positioned from the same shared reference (a fixed-width
            rail column every row shares) rather than independently-guessed offsets, so they always
            land in the same place regardless of content changes. */}
        <div className="sm:hidden relative">
          <div className="absolute left-3 top-3 bottom-3 w-px bg-gradient-to-b from-white/15 via-white/10 to-transparent" />
          {items.map((svc, i) => {
            const Icon = svc.icon
            const isOpen = openIndex === i
            return (
              <div key={i} className="flex items-start">
                <div className="w-6 shrink-0 flex justify-center pt-[26px]">
                  <span
                    className={`relative z-10 h-2.5 w-2.5 rounded-full border-2 transition-colors duration-300 ${
                      isOpen ? 'bg-primary border-primary' : 'bg-deep border-white/25'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 py-4 text-left"
                  >
                    <div
                      className={`h-9 w-9 shrink-0 rounded-xl border flex items-center justify-center transition-colors duration-300 ${
                        isOpen ? 'bg-primary border-primary' : 'bg-primary/15 border-primary/30'
                      }`}
                    >
                      <Icon className={`h-4 w-4 transition-colors duration-300 ${isOpen ? 'text-deep' : 'text-primary'}`} strokeWidth={2} />
                    </div>
                    <h3 className="flex-1 font-display font-semibold text-base text-white">{svc.title}</h3>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-white/40'}`}
                    />
                  </button>
                  <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                    <div className="overflow-hidden">
                      <div className="mb-4 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                        <p className="text-white/60 text-sm leading-relaxed">{svc.text}</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-b border-white/10" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
