import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Analytics from './components/Analytics.tsx'
import RouteMeta from './components/RouteMeta.tsx'

import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RouteMeta />
      <Analytics />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
