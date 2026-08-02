import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'

import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { ClinicSettingsProvider } from './context/ClinicSettingsContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ClinicSettingsProvider><App /></ClinicSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
