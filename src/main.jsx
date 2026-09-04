import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import { LanguageProvider } from './i18n.jsx'
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
