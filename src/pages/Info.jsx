import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './Info.css'

export default function Info() {
  const [pagine, setPagine] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [aperta, setAperta] = useState(null)

  useEffect(() => {
    carica()
  }, [])

  async function carica() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('info_pagine')
      .select('*')
      .order('ordine')
      .order('titolo')
    if (fetchError) setError(fetchError.message)
    else setPagine(data || [])
    setLoading(false)
  }

  return (
    <div className="info-page">
      <h1 className="page-title">Info</h1>
      <p className="hint">Informazioni utili del club: normative, attrezzatura richiesta, regole di sicurezza.</p>

      {error && <p className="info-error">Errore nel caricamento: {error}</p>}
      {loading && <p className="hint">Caricamento…</p>}
      {!loading && pagine.length === 0 && !error && <p className="hint">Nessuna informazione pubblicata al momento.</p>}

      <ul className="info-list">
        {pagine.map((p) => {
          const isAperta = aperta === p.id
          return (
            <li key={p.id} className="info-voce">
              <button
                className="info-voce-header"
                onClick={() => (p.tipo === 'testo' ? setAperta(isAperta ? null : p.id) : window.open(p.pdf_url, '_blank'))}
              >
                <span>{p.titolo}</span>
                <span className="info-voce-azione">{p.tipo === 'testo' ? (isAperta ? '−' : '+') : '↗'}</span>
              </button>

              {p.tipo === 'testo' && isAperta && (
                <div className="info-voce-corpo">
                  {(p.contenuto || '').split(/\n{2,}/).map((paragrafo, i) => (
                    <p key={i}>{paragrafo}</p>
                  ))}
                  {p.pdf_url && (
                    <a href={p.pdf_url} target="_blank" rel="noreferrer" className="info-voce-pdf">
                      Scarica come PDF
                    </a>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
