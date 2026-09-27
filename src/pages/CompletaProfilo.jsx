import { useState } from 'react'
import { useBozza } from '../lib/useBozza'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import './Auth.css'

const VUOTO = { codice: '', nome: '', cognome: '', telefono: '' }

export default function CompletaProfilo({ onCompletato }) {
  const [form, setForm, pulisciBozza] = useBozza('completa-profilo', VUOTO)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function aggiorna(campo, valore) {
    setForm((prev) => ({ ...prev, [campo]: valore }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: rpcError } = await supabase.rpc('registra_cliente', {
      p_codice: form.codice.trim(),
      p_nome: form.nome.trim(),
      p_cognome: form.cognome.trim(),
      p_telefono: form.telefono.trim() || null,
    })

    setLoading(false)

    if (rpcError) {
      setError(
        rpcError.message.includes('Codice invito')
          ? rpcError.message
          : "Non è stato possibile completare la registrazione: " + rpcError.message
      )
      return
    }

    pulisciBozza()
    onCompletato()
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img src={logo} alt="Logo" className="auth-logo" />
        <span className="auth-kicker">Ultimo passo</span>
        <h1>Completa la registrazione</h1>
        <p className="auth-info">
          Inserisci il codice invito che ti ha dato lo staff insieme ai tuoi dati.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="campo">
            <label htmlFor="codice">Codice invito</label>
            <input
              id="codice"
              value={form.codice}
              onChange={(e) => aggiorna('codice', e.target.value)}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="nome">Nome</label>
            <input id="nome" value={form.nome} onChange={(e) => aggiorna('nome', e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="cognome">Cognome</label>
            <input
              id="cognome"
              value={form.cognome}
              onChange={(e) => aggiorna('cognome', e.target.value)}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="telefono">Telefono (facoltativo)</label>
            <input
              id="telefono"
              value={form.telefono}
              onChange={(e) => aggiorna('telefono', e.target.value)}
            />
          </div>

          {error && <p className="errore-form">{error}</p>}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Completo…' : 'Completa registrazione'}
          </button>
        </form>
      </div>
    </div>
  )
}
