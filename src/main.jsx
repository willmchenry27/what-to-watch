import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UserActionsProvider } from './hooks/useUserActions.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserActionsProvider>
      <App />
    </UserActionsProvider>
  </StrictMode>,
)
