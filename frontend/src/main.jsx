import React from 'react'
import ReactDOM from 'react-dom/client'
import { consumeWlSessionHandoff } from './utils/wlSessionHandoff.js'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'

consumeWlSessionHandoff()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
