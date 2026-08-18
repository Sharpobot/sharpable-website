import { useEffect, useState } from 'react'

export default function BuildScanner() {
  const [statusIdx, setStatusIdx] = useState(0)
  const [count, setCount] = useState(7)

  const statuses = [
    { text: 'Drafting layout · component pass', label: 'Designing', tone: 'primary' },
    { text: 'Compiling components · staging build', label: 'Building', tone: 'accent' },
    { text: 'Running Lighthouse · perf pass', label: 'Optimizing', tone: 'primary' },
    { text: 'Live on production · all checks green', label: 'Shipped', tone: 'emerald' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((idx) => {
        const next = (idx + 1) % statuses.length
        if (statuses[next].label === 'Shipped') {
          setCount((c) => c + 1)
        }
        return next
      })
    }, 2300)
    return () => clearInterval(interval)
  }, [])

  // Falling code-bracket particles
  const drops = [
    { left: '15%', delay: '0.0s', dur: '2.6s', size: 16 },
    { left: '25%', delay: '1.3s', dur: '3.0s', size: 13 },
    { left: '38%', delay: '0.6s', dur: '2.8s', size: 18 },
    { left: '50%', delay: '1.8s', dur: '2.4s', size: 14 },
    { left: '62%', delay: '0.9s', dur: '3.1s', size: 17 },
    { left: '74%', delay: '2.0s', dur: '2.7s', size: 13 },
    { left: '85%', delay: '0.4s', dur: '2.9s', size: 16 },
  ]

  // Fixed scan-line sweep positions
  const ripples = [
    { left: '22%', delay: '0.2s' },
    { left: '48%', delay: '1.0s' },
    { left: '76%', delay: '1.8s' },
  ]

  const status = statuses[statusIdx]
  const toneText =
    status.tone === 'emerald' ? 'text-emerald-400' :
    status.tone === 'accent' ? 'text-accent' :
    'text-primary'
  const toneDot =
    status.tone === 'emerald' ? 'bg-emerald-400' :
    status.tone === 'accent' ? 'bg-accent' :
    'bg-primary'

  return (
    <div
      className="relative h-44 w-full rounded-3xl overflow-hidden border border-primary/15"
      style={{
        background: 'linear-gradient(180deg, #1A1610 0%, #2A2008 65%, #3D2E08 100%)',
      }}
    >
      {/* Soft glow blobs */}
      <div className="absolute -top-8 -left-6 h-20 w-32 rounded-full bg-primary/20 blur-2xl" />
      <div className="absolute top-2 right-10 h-14 w-24 rounded-full bg-accent/15 blur-xl" />

      {/* Header strip */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            Build pipeline
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-display font-bold text-sm text-white tabular-nums">
            {String(count).padStart(2, '0')}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
            shipped today
          </span>
        </div>
      </div>

      {/* Browser window bar at top */}
      <svg className="absolute left-3 right-3 top-9 h-5" viewBox="0 0 400 20" preserveAspectRatio="none">
        <rect x="0" y="2" width="400" height="16" rx="6" fill="#D4AF37" fillOpacity="0.12" />
        <rect x="0" y="2" width="400" height="16" rx="6" fill="none" stroke="#D4AF37" strokeOpacity="0.25" strokeWidth="1" />
        <circle cx="14" cy="10" r="2.4" fill="#E8CC6E" fillOpacity="0.8" />
        <circle cx="24" cy="10" r="2.4" fill="#F5E6C8" fillOpacity="0.6" />
        <circle cx="34" cy="10" r="2.4" fill="#B8941F" fillOpacity="0.6" />
        <rect x="48" y="6.5" width="180" height="7" rx="3.5" fill="#D4AF37" fillOpacity="0.18" />
      </svg>

      {/* Falling code-bracket field */}
      <div className="absolute inset-x-0 top-14 bottom-11 overflow-hidden">
        {drops.map((d, i) => (
          <svg
            key={i}
            className="absolute top-0"
            style={{
              left: d.left,
              width: `${d.size}px`,
              height: `${d.size}px`,
              animation: `rain-fall ${d.dur} cubic-bezier(0.55,0.05,0.7,0.45) ${d.delay} infinite`,
              filter: 'drop-shadow(0 1px 2px rgba(212,175,55,0.35))',
              transform: 'translateX(-50%)',
            }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <defs>
              <linearGradient id={`bracket-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F5E6C8" />
                <stop offset="50%" stopColor="#E8CC6E" />
                <stop offset="100%" stopColor="#B8941F" />
              </linearGradient>
            </defs>
            <polyline points="16 18 22 12 16 6" stroke={`url(#bracket-${i})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="8 6 2 12 8 18" stroke={`url(#bracket-${i})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
      </div>

      {/* Terminal line with blinking cursor */}
      <div className="absolute bottom-9 left-3 right-3 h-3 flex items-center">
        <div className="h-px w-full bg-primary/25" />
        <span className="absolute left-0 -top-2.5 font-mono text-[10px] text-primary/70 flex items-center gap-1">
          <span className="text-white/40">$</span> building
          <span className="inline-block w-1.5 h-3 bg-primary animate-blink" />
        </span>
      </div>

      {/* Scan-line sweeps */}
      <div className="absolute bottom-[34px] left-3 right-3 h-2">
        {ripples.map((r, i) => (
          <span
            key={i}
            className="absolute top-0 -translate-x-1/2 rounded-full border border-primary/40"
            style={{
              left: r.left,
              width: '4px',
              height: '4px',
              animation: `rain-ripple 2.4s ease-out ${r.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Bottom status */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`relative h-2 w-2 rounded-full ${toneDot}`}>
            {status.tone === 'accent' && (
              <span className={`absolute inset-0 rounded-full ${toneDot} animate-ping`} />
            )}
          </span>
          <span
            key={status.text}
            className={`font-mono text-[10px] truncate ${toneText}`}
            style={{ animation: 'rain-fadein 0.35s ease-out' }}
          >
            {status.text}
          </span>
        </div>
        <span className={`font-mono text-[9px] uppercase tracking-[0.2em] whitespace-nowrap pl-2 ${toneText}`}>
          {status.label}
        </span>
      </div>

      <style>{`
        @keyframes rain-fall {
          0%   { transform: translate(-50%, -10px) rotate(0deg); opacity: 0; }
          12%  { opacity: 1; }
          82%  { opacity: 1; }
          100% { transform: translate(-50%, 95px) rotate(25deg); opacity: 0; }
        }
        @keyframes rain-ripple {
          0%   { transform: translateX(-50%) scale(0.4); opacity: 0.9; }
          80%  { transform: translateX(-50%) scale(3.5); opacity: 0; }
          100% { transform: translateX(-50%) scale(3.5); opacity: 0; }
        }
        @keyframes rain-fadein {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
