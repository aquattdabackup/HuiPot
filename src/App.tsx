import { Routes, Route } from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { Landing } from './pages/Landing'
import { Explore } from './pages/Explore'
import { Create } from './pages/Create'
import { Pool } from './pages/Pool'
import { Proof } from './pages/Proof'

export default function App() {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--canvas)' }}>
      <AppHeader />
      {/* Landing provides its own <section id="main-content">; app routes get <main> */}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pools" element={<main id="main-content"><Explore /></main>} />
        <Route path="/create" element={<main id="main-content"><Create /></main>} />
        <Route path="/pools/:poolId" element={<main id="main-content"><Pool /></main>} />
        <Route path="/pools/:poolId/proof" element={<main id="main-content"><Proof /></main>} />
        <Route
          path="*"
          element={
            <main id="main-content">
              <div className="mx-auto max-w-lg px-4 py-16 text-center">
                <h1 className="display text-2xl font-bold mb-3" style={{ color: 'var(--ink)' }}>
                  Page not found
                </h1>
                <a href="/" className="text-sm underline" style={{ color: 'var(--muted)' }}>
                  Go to home
                </a>
              </div>
            </main>
          }
        />
      </Routes>
    </div>
  )
}
