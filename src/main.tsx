import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/roboto/700.css'
import '@fontsource/roboto/900.css'
import App from './App.tsx'
import { CrashBoundary } from './CrashBoundary.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashBoundary>
      <App />
    </CrashBoundary>
  </StrictMode>,
)
