import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import BetaBanner from '../components/BetaBanner'
import './Auth.css'

export default function PasswordDimenticata() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inviata, setInviata] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nuova-password`,
    })

    setLoading(false)

    if (resetError) setError(resetError.message)
    else setInviata(true)
  }

  if (inviata) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <BetaBanner />
          <img src={logo} alt="Logo" className="auth-logo" />
          <h1>Controlla la tua email</h1>
          <p className="auth-info">
            Se l'indirizzo <strong>{email}</strong> corrisponde a un account, riceverai a
            breve un link per impostare una nuova password.
          </p>
          <Link to="/login" className="btn-primary auth-submit">
            Torna al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <BetaBanner />
        <img src={logo} alt="Logo" className="auth-logo" />
        <span className="auth-kicker">Gestione attività</span>
        <h1>Password dimenticata</h1>

        <form onSubmit={handleSubmit}>
          <div className="campo">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && <p className="errore-form">{error}</p>}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Invio…' : 'Invia link di recupero'}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login">Torna al login</Link>
        </p>
      </div>
    </div>
  )
}
