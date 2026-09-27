import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { leggiBozza, scriviBozza, esisteBozza, dimenticaBozza } from '../lib/useBozza'
import './DatiPersonali.css'

const VUOTO = {
  via: '',
  cap: '',
  citta: '',
  data_nascita: '',
  citta_nascita: '',
  codice_fiscale: '',
  partita_iva: '',
  ragione_sociale: '',
}

export default function DatiPersonali({ clienteId }) {
  const bozzaKey = `dati-personali-${clienteId}`
  const [aperto, setAperto] = useState(false)
  const [form, setForm] = useState(() => leggiBozza(bozzaKey) || VUOTO)
  const [loading, setLoading] = useState(true)
  const [salvataggio, setSalvataggio] = useState(false)
  const [error, setError] = useState(null)
  const [salvato, setSalvato] = useState(false)

  useEffect(() => {
    carica()
  }, [clienteId])

  async function carica() {
    setLoading(true)
    const { data } = await supabase
      .from('clienti_dati_estesi')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle()

    if (data && !esisteBozza(bozzaKey)) setForm({ ...VUOTO, ...data })
    setLoading(false)
  }

  function aggiorna(campo, valore) {
    setForm((prev) => {
      const next = { ...prev, [campo]: valore }
      scriviBozza(bozzaKey, next)
      return next
    })
    setSalvato(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const payload = {
      cliente_id: clienteId,
      via: (form.via || '').trim() || null,
      cap: (form.cap || '').trim() || null,
      citta: (form.citta || '').trim() || null,
      data_nascita: form.data_nascita || null,
      citta_nascita: (form.citta_nascita || '').trim() || null,
      codice_fiscale: (form.codice_fiscale || '').trim() || null,
      partita_iva: (form.partita_iva || '').trim() || null,
      ragione_sociale: (form.ragione_sociale || '').trim() || null,
    }

    const { error: upsertError } = await supabase
      .from('clienti_dati_estesi')
      .upsert(payload, { onConflict: 'cliente_id' })

    setSalvataggio(false)

    if (upsertError) setError(upsertError.message)
    else {
      setSalvato(true)
      dimenticaBozza(bozzaKey)
    }
  }

  return (
    <div className="dati-personali-box">
      <button
        type="button"
        className="dati-personali-toggle"
        onClick={() => setAperto((v) => !v)}
      >
        Dati personali {aperto ? '▲' : '▼'}
      </button>

      {aperto && (
        loading ? (
          <p className="hint">Caricamento…</p>
        ) : (
          <form onSubmit={handleSubmit} className="dati-personali-form">
            <div className="campo">
              <label htmlFor="via">Via</label>
              <input id="via" value={form.via || ''} onChange={(e) => aggiorna('via', e.target.value)} />
            </div>

            <div className="dati-personali-row">
              <div className="campo">
                <label htmlFor="cap">CAP</label>
                <input id="cap" value={form.cap || ''} onChange={(e) => aggiorna('cap', e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="citta">Città</label>
                <input id="citta" value={form.citta || ''} onChange={(e) => aggiorna('citta', e.target.value)} />
              </div>
            </div>

            <div className="dati-personali-row">
              <div className="campo">
                <label htmlFor="data_nascita">Data di nascita</label>
                <input
                  id="data_nascita"
                  type="date"
                  value={form.data_nascita || ''}
                  onChange={(e) => aggiorna('data_nascita', e.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="citta_nascita">Città di nascita</label>
                <input
                  id="citta_nascita"
                  value={form.citta_nascita || ''}
                  onChange={(e) => aggiorna('citta_nascita', e.target.value)}
                />
              </div>
            </div>

            <div className="campo">
              <label htmlFor="codice_fiscale">Codice fiscale</label>
              <input
                id="codice_fiscale"
                value={form.codice_fiscale || ''}
                onChange={(e) => aggiorna('codice_fiscale', e.target.value)}
              />
            </div>

            <p className="hint dati-personali-hint">
              Da compilare solo se rilevanti per te (es. se lavori con partita IVA).
            </p>

            <div className="dati-personali-row">
              <div className="campo">
                <label htmlFor="partita_iva">Partita IVA</label>
                <input
                  id="partita_iva"
                  value={form.partita_iva || ''}
                  onChange={(e) => aggiorna('partita_iva', e.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="ragione_sociale">Ragione sociale</label>
                <input
                  id="ragione_sociale"
                  value={form.ragione_sociale || ''}
                  onChange={(e) => aggiorna('ragione_sociale', e.target.value)}
                />
              </div>
            </div>

            {error && <p className="errore-form">{error}</p>}
            {salvato && <p className="avviso avviso-ok">Dati salvati.</p>}

            <button type="submit" className="btn-primary" disabled={salvataggio}>
              {salvataggio ? 'Salvataggio…' : 'Salva'}
            </button>
          </form>
        )
      )}
    </div>
  )
}
