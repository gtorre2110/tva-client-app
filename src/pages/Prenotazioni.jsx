import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formattaOra, formattaDataConAnno, scomponiData } from '../lib/util'
import './Attivita.css'
import './Prenotazioni.css'

export default function Prenotazioni({ cliente }) {
  const [prenotazioni, setPrenotazioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [annullando, setAnnullando] = useState(null)
  const [macroNomiPerAttivita, setMacroNomiPerAttivita] = useState(new Map())
  const [posizioni, setPosizioni] = useState(new Map())
  const [periodo, setPeriodo] = useState('prossime')

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

    const oggi = new Date().toISOString().slice(0, 10)
    const inCodaProssime = (data || []).filter(
      (p) => p.stato === 'in_coda' && p.attivita && p.attivita.data >= oggi && !p.attivita.annullata
    )
    if (inCodaProssime.length > 0) {
      const nuovePosizioni = new Map()
      await Promise.all(
        inCodaProssime.map(async (p) => {
          const { data: pos } = await supabase.rpc('posizione_in_coda', { p_attivita_id: p.attivita_id })
          nuovePosizioni.set(p.attivita_id, pos)
        })
      )
      setPosizioni(nuovePosizioni)
    }

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

      const mappaNomi = new Map()
      for (const riga of collegamenti || []) {
        if (mappaNomi.has(riga.attivita_id)) continue
        const macroId = risolviMacro(riga.categoria_id)
        if (!macroId) continue
        mappaNomi.set(riga.attivita_id, categoriePerId.get(macroId)?.nome || '')
      }
      setMacroNomiPerAttivita(mappaNomi)
    } else {
      setMacroNomiPerAttivita(new Map())
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

  const oggi = new Date().toISOString().slice(0, 10)
  const eProssima = (p) => p.stato !== 'annullata' && p.attivita && !p.attivita.annullata && p.attivita.data >= oggi
  const prossime = prenotazioni.filter(eProssima)
  const passate = prenotazioni.filter((p) => !eProssima(p))
  const elenco = periodo === 'prossime' ? prossime : passate

  return (
    <div>
      <h1 className="page-title">Le mie prenotazioni</h1>

      <div className="prenotazioni-stat-row">
        <div className="prenotazioni-stat">
          <div className="prenotazioni-stat-label">Ingressi disponibili</div>
          <div className={'prenotazioni-stat-valore' + (cliente.ingressi_disponibili < 0 ? ' valore-alert' : '')}>
            {cliente.ingressi_disponibili}
          </div>
        </div>
        <div className="prenotazioni-stat prenotazioni-stat-warning">
          <div className="prenotazioni-stat-label">Certificato medico</div>
          <div className="prenotazioni-stat-valore-piccolo">
            Scade il {formattaDataConAnno(cliente.scadenza_certificato_medico)}
          </div>
        </div>
      </div>

      <div className="prenotazioni-periodo-tabs" role="tablist" aria-label="Periodo">
        <button
          role="tab"
          aria-selected={periodo === 'prossime'}
          className={'prenotazioni-tab-periodo' + (periodo === 'prossime' ? ' active' : '')}
          onClick={() => setPeriodo('prossime')}
        >
          Prossime ({prossime.length})
        </button>
        <button
          role="tab"
          aria-selected={periodo === 'passate'}
          className={'prenotazioni-tab-periodo' + (periodo === 'passate' ? ' active' : '')}
          onClick={() => setPeriodo('passate')}
        >
          Passate
        </button>
      </div>

      {error && <p className="errore-form">Errore: {error}</p>}
      {loading && <p className="hint">Caricamento…</p>}
      {!loading && elenco.length === 0 && (
        <p className="hint">
          {periodo === 'prossime' ? 'Non hai prenotazioni in programma.' : 'Nessuna prenotazione passata.'}
        </p>
      )}

      <div className="prenotazioni-list">
        {elenco.map((p) => {
          const a = p.attivita
          const { giorno, num, mese } = scomponiData(a?.data)
          const macroNome = macroNomiPerAttivita.get(p.attivita_id)
          const posizione = posizioni.get(p.attivita_id)

          let tag = p.stato
          let tagClass = 'badge-neutro'
          let messaggio = null
          if (p.presente) { tag = 'PRESENTE REGISTRATA'; tagClass = 'badge-ok' }
          else if (p.stato === 'confermata') {
            tag = p.tardiva ? 'TARDIVA · DA CONFERMARE' : 'CONFERMATA'; tagClass = p.tardiva ? 'badge-warning' : 'badge-ok'
            if (periodo === 'prossime') messaggio = p.tardiva ? 'Prenotazione fatta dopo la chiusura: contatta lo staff per la conferma.' : "L'ingresso viene scalato al check-in."
          } else if (p.stato === 'in_coda') {
            tag = posizione ? `IN CODA · ${posizione}°` : 'IN LISTA D\'ATTESA'
            if (p.tardiva) tag += ' · TARDIVA'
            tagClass = 'badge-warning'
            if (periodo === 'prossime') messaggio = 'Se si libera un posto ti iscriviamo in automatico e ti avvisiamo via email.'
          } else if (p.stato === 'annullata') {
            tag = 'ANNULLATA'; tagClass = 'badge-alert'
          }

          return (
            <article className="prenotazione-card" key={p.id}>
              <div className="attivita-card-data">
                <span className="attivita-card-giorno">{giorno}</span>
                <span className="attivita-card-num">{num}</span>
                <span className="attivita-card-mese">{mese}</span>
              </div>

              <div className="prenotazione-card-body">
                <div className="prenotazione-card-riga-top">
                  {macroNome && <div className="attivita-card-macro">{macroNome}</div>}
                  <span className={'badge ' + tagClass}>{tag}</span>
                </div>
                <h2>{a?.nome ?? 'Attività'}</h2>
                {a && (
                  <div className="attivita-card-meta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
                    <span>{formattaOra(a.ora_inizio)}–{formattaOra(a.ora_fine)}</span>
                  </div>
                )}
                {messaggio && <p className="hint">{messaggio}</p>}

                {periodo === 'prossime' && (p.stato === 'confermata' || p.stato === 'in_coda') && !p.presente && (
                  <div className="attivita-card-footer prenotazione-card-footer">
                    <button
                      className="btn-secondary"
                      onClick={() => annulla(p)}
                      disabled={annullando === p.id}
                    >
                      {annullando === p.id ? 'Attendere…' : p.stato === 'in_coda' ? 'Esci dalla coda' : 'Annulla prenotazione'}
                    </button>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
