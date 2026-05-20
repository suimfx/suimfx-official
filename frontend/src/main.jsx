import React from 'react'
import ReactDOM from 'react-dom/client'
import { consumeWlSessionHandoff } from './utils/wlSessionHandoff.js'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'

consumeWlSessionHandoff()

// Register service worker for PWA (production only — avoids dev cache issues)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// Block zoom: Ctrl/Cmd + (+/-/0)
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['=', '-', '+', '0'].includes(e.key)) {
    e.preventDefault()
  }
}, { passive: false })

// Block zoom: Ctrl + wheel
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) e.preventDefault()
}, { passive: false })

// Block pinch zoom (touch)
window.addEventListener('gesturestart', (e) => e.preventDefault())
window.addEventListener('gesturechange', (e) => e.preventDefault())
window.addEventListener('gestureend', (e) => e.preventDefault())

// Block double-tap zoom on mobile
let lastTouchEnd = 0
document.addEventListener('touchend', (e) => {
  const now = Date.now()
  if (now - lastTouchEnd <= 300) {
    e.preventDefault()
  }
  lastTouchEnd = now
}, { passive: false })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
