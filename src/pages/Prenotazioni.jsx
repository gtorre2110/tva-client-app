import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formattaData, formattaOra } from '../lib/util'
import './Prenotazioni.css'

export default function Prenotazioni({ cliente }) {
  const [prenotazioni, setPrenotazioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [annullando, setAnnullando] = useState(null)
  const [mostraAnnullate, setMostraAnnullate] = useState(false)
  const [macrocategorie, setMacrocategorie] = useState([])
  const [macroPerAttivita, setMacroPerAttivita] = useState(new Map())
  const [schedaMacro, setSchedaMacro] = useState('tutte')

  useEffect(() => {
    carica()
  }, [])

  async function carica() {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('prenotazioni')
      .select('*, attivita(nome, data, ora_inizio, ora_fine, annullata)')
      .eq('cliente_id', cliente.id)
      .order('creato_il', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }
    setPrenotazioni(data)

    if (data.length > 0) {
      const attivitaIds = [...new Set(data.map((p) => p.attivita_id))]
      const [{ data: categorie }, { data: collegamenti }] = await Promise.all([
        supabase.from('categorie').select('*'),
        supabase.from('attivita_categorie').select('attivita_id, categoria_id').in('attivita_id', attivitaIds),
      ])

      const categoriePerId = new Map((categorie || []).map((c) => [c.id, c]))
      const risolviMacro = (categoriaId) => {
        const c = categoriePerId.get(categoriaId)
        if (!c) return null
        return c.categoria_padre_id || c.id
      }

      const mappa = new Map()
      for (const riga of collegamenti || []) {
        const macroId = risolviMacro(riga.categoria_id)
        if (!macroId) continue
        if (!mappa.has(riga.attivita_id)) mappa.set(riga.attivita_id, new Set())
        mappa.get(riga.attivita_id).add(macroId)
      }
      setMacroPerAttivita(mappa)
      setMacrocategorie((categorie || []).filter((c) => !c.categoria_padre_id).sort((a, b) => a.nome.localeCompare(b.nome)))
    } else {
      setMacroPerAttivita(new Map())
    }

    setLoading(false)
  }

  async function annulla(p) {
    setAnnullando(p.id)
    const { data, error: updateError } = await supabase
      .from('prenotazioni')
      .update({ stato: 'annullata' })
      .eq('id', p.id)
      .select()

    setAnnullando(null)

    if (updateError) {
      setError(updateError.message)
    } else if (!data || data.length === 0) {
      setError('Non è stato possibile annullare questa prenotazione (nessuna riga modificata).')
    } else {
      setError(null)
      carica()
    }
  }

  return (
    <div>
      <h1 className="page-title">Le mie prenotazioni</h1>

      <label className="prenotazioni-toggle">
        <input
          type="checkbox"
          checked={mostraAnnullate}
          onChange={(e) => setMostraAnnullate(e.target.checked)}
        />
        Mostra anche le annullate
      </label>

      {macrocategorie.length > 0 && (
        <div className="prenotazioni-tabs">
          <button
            className={'prenotazioni-tab' + (schedaMacro === 'tutte' ? ' active' : '')}
            onClick={() => setSchedaMacro('tutte')}
          >
            Tutte
          </button>
          {macrocategorie.map((m) => (
            <button
              key={m.id}
              className={'prenotazioni-tab' + (schedaMacro === m.id ? ' active' : '')}
              onClick={() => setSchedaMacro(m.id)}
            >
              {m.nome}
            </button>
          ))}
          <button
            className={'prenotazioni-tab' + (schedaMacro === 'senza-categoria' ? ' active' : '')}
            onClick={() => setSchedaMacro('senza-categoria')}
          >
            Senza categoria
          </button>
        </div>
      )}

      {error && <p className="errore-form">Errore: {error}</p>}
      {loading && <p className="hint">Caricamento…</p>}
      {!loading && prenotazioni.length === 0 && (
        <p className="hint">Non hai ancora nessuna prenotazione.</p>
      )}
      {!loading && prenotazioni.length > 0 &&
        !mostraAnnullate &&
        prenotazioni.every((p) => p.stato === 'annullata') && (
          <p className="hint">Nessuna prenotazione attiva al momento.</p>
        )}

      <div className="prenotazioni-list">
        {prenotazioni
          .filter((p) => mostraAnnullate || p.stato !== 'annullata')
          .filter((p) => {
            if (schedaMacro === 'tutte') return true
            const macroSet = macroPerAttivita.get(p.attivita_id)
            if (schedaMacro === 'senza-categoria') return !macroSet || macroSet.size === 0
            return macroSet && macroSet.has(schedaMacro)
          })
          .map((p) => {
          const a = p.attivita
          const passata = a && a.data < new Date().toISOString().slice(0, 10)

          return (
            <div className={'prenotazione-card' + (p.stato === 'annullata' ? ' annullata' : '')} key={p.id}>
              <div>
                <h2>{a?.nome ?? 'Attività'}</h2>
                {a && (
                  <p className="prenotazione-quando">
                    {formattaData(a.data)} · {formattaOra(a.ora_inizio)}–{formattaOra(a.ora_fine)}
                  </p>
                )}
                <span
                  className={
                    'badge ' +
                    (p.stato === 'confermata'
                      ? 'badge-ok'
                      : p.stato === 'annullata'
                      ? 'badge-alert'
                      : 'badge-warning')
                  }
                >
                  {p.presente ? 'Presente registrata' : p.stato === 'in_coda' ? 'In lista d\'attesa' : p.stato}
                </span>
              </div>

              {(p.stato === 'confermata' || p.stato === 'in_coda') && !passata && !p.presente && (
                <button
                  className="btn-secondary"
                  onClick={() => annulla(p)}
                  disabled={annullando === p.id}
                >
                  {annullando === p.id ? 'Annullo…' : 'Annulla'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
