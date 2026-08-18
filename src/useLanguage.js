import { useContext } from 'react'
import { LanguageContext } from './language-context.js'

export function useLanguage() {
  return useContext(LanguageContext)
}
