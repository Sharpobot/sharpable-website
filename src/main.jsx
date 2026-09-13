import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import { LanguageProvider } from './i18n.jsx'

// Self-hosted, and only the weights actually used anywhere in the codebase (see the git commit
// this landed in for the full audit) — replaces the old Google Fonts <link>, which was the single
// biggest render-blocking cost on the page per a real Lighthouse run (778ms just for the round trip
// to fetch fonts.googleapis.com's CSS, before any font file was even requested). `latin-*` variants
// specifically (not the combined per-weight file, which bundles cyrillic/greek/vietnamese @font-face
// declarations we never need) — this site is English/Bahasa Melayu only, both plain Latin script.
//
// Headings font swapped from Plus Jakarta Sans to Archivo (a later session, to match the new logo's
// wordmark, which is set in Archivo SemiExpanded) — `wdth.css` is the variable-width build, the only
// one that supports `font-stretch: semi-expanded` (see index.css's `.font-display` rule); Archivo has
// no separately-published "SemiExpanded" static family, width is a variable axis on the one family.
// It still only ships 3 unicode-range-gated subsets (vietnamese/latin-ext/latin) same as any
// fontsource package — the browser only ever fetches the "latin" one for this site's actual text, so
// this isn't a regression from the old latin-only static files despite importing the combined file
// (fontsource doesn't publish a pre-split latin-only variant of its variable-font builds). One file
// now covers every weight (100-900) and width (62%-125%) this project uses, instead of 3 separate
// per-weight downloads.
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/cormorant-garamond/latin-400-italic.css'
import '@fontsource/cormorant-garamond/latin-500-italic.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import './index.css'

// eslint-disable-next-line react-refresh/only-export-components -- root entry point, never fast-refreshed itself
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
// eslint-disable-next-line react-refresh/only-export-components -- root entry point, never fast-refreshed itself
const Terms = lazy(() => import('./pages/Terms.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>
)
