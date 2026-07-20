import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { Toaster } from 'sonner';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="1068307317514-pehu19lkn4ip5rogol22oaveet4riqth.apps.googleusercontent.com">
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <Toaster richColors position="top-right" />
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)