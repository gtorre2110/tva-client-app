import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import BetaBanner from './BetaBanner'
import './AppShell.css'

// Voci principali, ordinate per frequenza d'uso.
const NAV_PRINCIPALI = [
  { to: '/attivita', label: 'Attività' },
  { to: '/prenotazioni', label: 'Prenotazioni' },
  { to: '/logbook', label: 'Logbook' },
  { to: '/brevetti', label: 'Brevetti' },
  { to: '/profilo', label: 'Il mio profilo' },
]

const NAV_SECONDARIE = [
  { to: '/info', label: 'Info' },
  { to: '/aiuto', label: 'Aiuto' },
]

export default function AppShell({ cliente }) {
  const [menuAperto, setMenuAperto] = useState(false)
  const [confermaEsci, setConfermaEsci] = useState(false)

  function renderVoci(voci) {
    return voci.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={() => setMenuAperto(false)}
        className={({ isActive }) => 'app-sheet-link' + (isActive ? ' active' : '')}
      >
        {item.label}
      </NavLink>
    ))
  }

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
              {renderVoci(NAV_PRINCIPALI)}
              <div className="app-sheet-sep" />
              {renderVoci(NAV_SECONDARIE)}
              <div className="app-sheet-sep" />
              <button
                type="button"
                className="app-sheet-link app-sheet-esci"
                onClick={() => {
                  setMenuAperto(false)
                  setConfermaEsci(true)
                }}
              >
                Esci
              </button>
            </nav>
          </div>
        </div>
      )}

      {confermaEsci && (
        <div className="app-conferma-overlay" onClick={() => setConfermaEsci(false)}>
          <div className="app-conferma" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Uscire dall'app?</h2>
            <p>Per rientrare dovrai fare di nuovo il login.</p>
            <div className="app-conferma-azioni">
              <button type="button" className="btn-secondary" onClick={() => setConfermaEsci(false)}>
                Annulla
              </button>
              <button type="button" className="btn-primary" onClick={() => supabase.auth.signOut()}>
                Esci
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
