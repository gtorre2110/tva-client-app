import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './Info.css'

const SCHEDE = [
  { id: 'informazioni', label: 'Informazioni', tipo: 'testo' },
  { id: 'documenti', label: 'Documenti', tipo: 'pdf' },
]

export default function Info() {
  const [pagine, setPagine] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scheda, setScheda] = useState('informazioni')
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

  const tipoAttivo = SCHEDE.find((s) => s.id === scheda).tipo
  const voci = pagine.filter((p) => p.tipo === tipoAttivo)
  const articoloAperto = tipoAttivo === 'testo' ? voci.find((v) => v.id === aperta) : null

  function cambiaScheda(id) {
    setScheda(id)
    setAperta(null)
  }

  // Vista articolo a tutta pagina per una voce "Informazioni" aperta.
  if (articoloAperto) {
    return (
      <div className="info-page info-articolo">
        <button className="info-indietro" onClick={() => setAperta(null)}>
          ← Informazioni
        </button>
        <h1 className="info-articolo-titolo">{articoloAperto.titolo}</h1>
        <div className="info-articolo-corpo">
          {(articoloAperto.contenuto || '').split(/\n{2,}/).map((paragrafo, i) => (
            <p key={i}>{paragrafo}</p>
          ))}
        </div>
        {articoloAperto.pdf_url && (
          <a href={articoloAperto.pdf_url} target="_blank" rel="noreferrer" className="btn-secondary info-articolo-pdf">
            Scarica come PDF
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="info-page">
      <h1 className="page-title">Info</h1>
      <p className="hint">Informazioni utili del club e documenti da scaricare.</p>

      <div className="info-tabs">
        {SCHEDE.map((s) => (
          <button
            key={s.id}
            className={'info-tab' + (scheda === s.id ? ' active' : '')}
            onClick={() => cambiaScheda(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="info-error">Errore nel caricamento: {error}</p>}
      {loading && <p className="hint">Caricamento…</p>}
      {!loading && voci.length === 0 && !error && (
        <p className="hint">
          {tipoAttivo === 'testo' ? 'Nessuna informazione pubblicata al momento.' : 'Nessun documento pubblicato al momento.'}
        </p>
      )}

      <ul className="info-list">
        {voci.map((v) => (
          <li key={v.id}>
            <button
              className="info-voce-header"
              onClick={() => (tipoAttivo === 'testo' ? setAperta(v.id) : window.open(v.pdf_url, '_blank'))}
            >
              <span>{v.titolo}</span>
              <span className="info-voce-azione">{tipoAttivo === 'testo' ? '›' : '↓'}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
