import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// A route change in this SPA doesn't animate or reset scroll on its own, and React Router unmounts
// the page immediately on navigation — with no way to animate an "exit" after the fact. So closing
// is faked: play the fade-down first, then actually navigate once it's finished.
const EXIT_DURATION_MS = 350

export function useLegalPageTransition() {
  const [closing, setClosing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleBack = (e) => {
    e.preventDefault()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate('/')
      return
    }
    setClosing(true)
    setTimeout(() => navigate('/'), EXIT_DURATION_MS)
  }

  return { pageClassName: closing ? 'animate-page-out' : 'animate-page-in', handleBack }
}
