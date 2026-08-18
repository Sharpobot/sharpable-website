import { createContext } from 'react'
import { translations } from './translations.js'

export const LanguageContext = createContext({
  lang: 'en',
  t: translations.en,
  toggleLang: () => {},
})
