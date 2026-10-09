import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import BetaBanner from '../components/BetaBanner'
import CampoPassword from '../components/CampoPassword'
import './Auth.css'

export default function Registrati() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [emailInviata, setEmailInviata] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // Se il progetto Supabase richiede la conferma email, non c'è ancora una sessione:
    // mostriamo un messaggio. Altrimenti App.jsx rileva la sessione e porta al passo successivo.
    if (!data.session) {
      setEmailInviata(true)
    }
  }

  if (emailInviata) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <BetaBanner />
          <img src={logo} alt="Logo" className="auth-logo" />
          <h1>Controlla la tua email</h1>
          <p className="auth-info">
            Ti abbiamo inviato un'email di conferma a <strong>{email}</strong>. Apri il link
            dentro per confermare l'account, poi torna qui per accedere.
          </p>
          <Link to="/login" className="btn-primary auth-submit">
            Vai al login
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
        <h1>Crea il tuo account</h1>

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
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="errore-form">{error}</p>}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Creazione…' : 'Continua'}
          </button>
        </form>

        <p className="auth-switch">
          Hai già un account? <Link to="/login">Accedi</Link>
        </p>
      </div>
    </div>
  )
}
