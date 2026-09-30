import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import CampoPassword from '../components/CampoPassword'
import BetaBanner from '../components/BetaBanner'
import './Auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email o password non corrette.'
          : signInError.message
      )
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <BetaBanner />
        <img src={logo} alt="Logo" className="auth-logo" />
        <span className="auth-kicker">Gestione attività</span>
        <h1>Accedi</h1>

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
          <CampoPassword
            id="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="errore-form">{error}</p>}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/password-dimenticata">Password dimenticata?</Link>
        </p>

        <p className="auth-switch">
          Hai un codice invito e non hai ancora un account?{' '}
          <Link to="/registrati">Registrati</Link>
        </p>
      </div>
    </div>
  )
}
