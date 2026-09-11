import { useEffect, useRef, useState } from 'react'

// Shared by the Features widgets (DesignShuffler/BuildScanner/StrategyScheduler) so their
// auto-cycling setInterval loops stop once scrolled out of view instead of running forever in the
// background — same reasoning as HeroShaderBackground's IntersectionObserver gate.
export function useOnScreen() {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0,
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}
