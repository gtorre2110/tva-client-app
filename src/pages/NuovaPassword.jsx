import { useState } from 'react'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import CampoPassword from '../components/CampoPassword'
import './Auth.css'

export default function NuovaPassword({ onCompletato }) {
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fatto, setFatto] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== conferma) {
      setError('Le due password non coincidono.')
      return
    }
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) setError(updateError.message)
    else setFatto(true)
  }

  if (fatto) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <img src={logo} alt="Logo" className="auth-logo" />
          <h1>Fatto!</h1>
          <p className="auth-info">La tua password è stata aggiornata.</p>
          <button type="button" className="btn-primary auth-submit" onClick={onCompletato}>
            Continua
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img src={logo} alt="Logo" className="auth-logo" />
        <span className="auth-kicker">Recupero accesso</span>
        <h1>Nuova password</h1>

        <form onSubmit={handleSubmit}>
          <CampoPassword
            id="password"
            label="Nuova password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <CampoPassword
            id="conferma"
            label="Conferma password"
            autoComplete="new-password"
            minLength={6}
            value={conferma}
            onChange={(e) => setConferma(e.target.value)}
            required
          />

          {error && <p className="errore-form">{error}</p>}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Salvataggio…' : 'Salva nuova password'}
          </button>
        </form>
      </div>
    </div>
  )
}
