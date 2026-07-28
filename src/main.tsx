import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/scoreTwelve.css'
import './styles/gif.css'
import App from './App.tsx'
import { FavoritesProvider } from './hooks/useFavorites.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FavoritesProvider>
      <App />
    </FavoritesProvider>
  </StrictMode>,
)
