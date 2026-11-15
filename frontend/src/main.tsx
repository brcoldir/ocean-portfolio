import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Analytics from './components/Analytics.tsx'
import RouteMeta from './components/RouteMeta.tsx'

import { BrowserRouter } from 'react-router-dom'

// #root may already contain build-time prerendered HTML for crawlers;
// createRoot replaces it with the live app.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RouteMeta />
      <Analytics />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
