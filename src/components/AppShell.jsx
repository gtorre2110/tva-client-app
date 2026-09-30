import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import logo from '../assets/logo.png'
import BetaBanner from './BetaBanner'
import './AppShell.css'

const NAV_ITEMS = [
  { to: '/profilo', label: 'Il mio profilo' },
  { to: '/attivita', label: 'Attività' },
  { to: '/prenotazioni', label: 'Prenotazioni' },
  { to: '/categorie', label: 'Categorie' },
  { to: '/brevetti', label: 'Brevetti' },
  { to: '/logbook', label: 'Logbook' },
  { to: '/aiuto', label: 'Aiuto' },
]

export default function AppShell({ cliente }) {
  const [menuAperto, setMenuAperto] = useState(false)

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <BetaBanner />
        <img src={logo} alt="Logo" />
        {cliente && <span className="app-topbar-nome">{cliente.nome}</span>}
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <button
        className="app-fab"
        onClick={() => setMenuAperto(true)}
        aria-label="Apri menu"
        aria-expanded={menuAperto}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {menuAperto && (
        <div className="app-sheet-overlay" onClick={() => setMenuAperto(false)}>
          <div className="app-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="app-sheet-handle" />
            <nav className="app-sheet-nav">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuAperto(false)}
                  className={({ isActive }) => 'app-sheet-link' + (isActive ? ' active' : '')}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
