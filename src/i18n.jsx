import { useEffect, useState } from 'react'
import { translations } from './translations.js'
import { LanguageContext } from './language-context.js'

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return localStorage.getItem('sharpable-lang') || 'en'
  })

  useEffect(() => {
    localStorage.setItem('sharpable-lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  const toggleLang = () => setLang((prev) => (prev === 'en' ? 'ms' : 'en'))

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}
