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
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pools" element={<Explore />} />
          <Route path="/create" element={<Create />} />
          <Route path="/pools/:poolId" element={<Pool />} />
          <Route path="/pools/:poolId/proof" element={<Proof />} />
          <Route
            path="*"
            element={
              <div className="mx-auto max-w-lg px-4 py-16 text-center">
                <h1 className="display text-2xl font-bold mb-3" style={{ color: 'var(--ink)' }}>
                  Page not found
                </h1>
                <a href="/" className="text-sm underline" style={{ color: 'var(--muted)' }}>
                  Go to home
                </a>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  )
}
