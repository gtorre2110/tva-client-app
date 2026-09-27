import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formattaData, formattaOra, certificatoScaduto } from '../lib/util'
import './Attivita.css'
import './Prenotazioni.css'

export default function Attivita({ cliente }) {
  const certificatoNonValido = certificatoScaduto(cliente.scadenza_certificato_medico)
  const [occorrenze, setOccorrenze] = useState([])
  const [prenotateIds, setPrenotateIds] = useState(new Set())
  const [inCodaIds, setInCodaIds] = useState(new Set())
  const [posizioni, setPosizioni] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [prenotando, setPrenotando] = useState(null)
  const [esito, setEsito] = useState(null)
  const [macrocategorie, setMacrocategorie] = useState([])
  const [macroPerAttivita, setMacroPerAttivita] = useState(new Map())
  const [schedaMacro, setSchedaMacro] = useState('tutte')

  useEffect(() => {
    carica()
  }, [])

  async function carica() {
    setLoading(true)
    setError(null)
    const oggi = new Date().toISOString().slice(0, 10)

    const [{ data, error: fetchError }, { data: mieProp }] = await Promise.all([
      supabase
        .from('attivita_con_disponibilita')
        .select('*')
        .gte('data', oggi)
        .eq('annullata', false)
        .order('data', { ascending: true })
        .order('ora_inizio', { ascending: true }),
      supabase
        .from('prenotazioni')
        .select('attivita_id, stato')
        .eq('cliente_id', cliente.id)
        .in('stato', ['confermata', 'in_coda']),
    ])

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setPrenotateIds(new Set((mieProp || []).filter((p) => p.stato === 'confermata').map((p) => p.attivita_id)))
    const codaIds = (mieProp || []).filter((p) => p.stato === 'in_coda').map((p) => p.attivita_id)
    setInCodaIds(new Set(codaIds))

    if (codaIds.length > 0) {
      const nuovePosizioni = new Map()
      await Promise.all(
        codaIds.map(async (attivitaId) => {
          const { data: pos } = await supabase.rpc('posizione_in_coda', { p_attivita_id: attivitaId })
          nuovePosizioni.set(attivitaId, pos)
        })
      )
      setPosizioni(nuovePosizioni)
    }

    if (data.length === 0) {
      setOccorrenze([])
      setMacroPerAttivita(new Map())
      setLoading(false)
      return
    }

    const [{ data: mieCategorie }, { data: categorieAttivita }, { data: categorie }] = await Promise.all([
      supabase.from('clienti_categorie').select('categoria_id').eq('cliente_id', cliente.id),
      supabase
        .from('attivita_categorie')
        .select('attivita_id, categoria_id')
        .in('attivita_id', data.map((o) => o.id)),
      supabase.from('categorie').select('*'),
    ])

    const mieCategorieSet = new Set((mieCategorie || []).map((c) => c.categoria_id))
    const categoriePerAttivita = new Map()
    for (const riga of categorieAttivita || []) {
      if (!categoriePerAttivita.has(riga.attivita_id)) {
        categoriePerAttivita.set(riga.attivita_id, [])
      }
      categoriePerAttivita.get(riga.attivita_id).push(riga.categoria_id)
    }

    const visibili = data.filter((o) => {
      const categorieAttivita = categoriePerAttivita.get(o.id)
      // Nessuna categoria collegata = visibile a tutti
      if (!categorieAttivita || categorieAttivita.length === 0) return true
      return categorieAttivita.some((cid) => mieCategorieSet.has(cid))
    })

    // Raggruppamento per macrocategoria (solo per organizzare le schede, non incide sulla visibilità)
    const categoriePerId = new Map((categorie || []).map((c) => [c.id, c]))
    const risolviMacro = (categoriaId) => {
      const c = categoriePerId.get(categoriaId)
      if (!c) return null
      return c.categoria_padre_id || c.id
    }
    const mappaMacro = new Map()
    for (const [attivitaId, cats] of categoriePerAttivita.entries()) {
      for (const cid of cats) {
        const macroId = risolviMacro(cid)
        if (!macroId) continue
        if (!mappaMacro.has(attivitaId)) mappaMacro.set(attivitaId, new Set())
        mappaMacro.get(attivitaId).add(macroId)
      }
    }
    setMacroPerAttivita(mappaMacro)
    setMacrocategorie((categorie || []).filter((c) => !c.categoria_padre_id).sort((a, b) => a.nome.localeCompare(b.nome)))

    setOccorrenze(visibili)
    setLoading(false)
  }

  async function prenota(occorrenza, stato = 'confermata') {
    if (prenotateIds.has(occorrenza.id) || inCodaIds.has(occorrenza.id)) return

    setPrenotando(occorrenza.id)
    setEsito(null)

    const { error: insertError } = await supabase.from('prenotazioni').insert({
      attivita_id: occorrenza.id,
      cliente_id: cliente.id,
      nome: cliente.nome,
      cognome: cliente.cognome,
      stato,
    })

    setPrenotando(null)

    if (insertError) {
      const messaggio = insertError.code === '23505'
        ? 'Hai già una prenotazione (o sei già in lista d\'attesa) per questa attività.'
        : insertError.message
      setEsito({ tipo: 'errore', id: occorrenza.id, messaggio })
      if (insertError.code === '23505') carica()
    } else {
      setEsito({ tipo: stato === 'in_coda' ? 'coda' : 'ok', id: occorrenza.id })
      carica()
    }
  }

  return (
    <div>
      <h1 className="page-title">Attività</h1>

      {cliente.prenotazioni_bloccate && (
        <p className="avviso avviso-alert">
          Le tue prenotazioni sono al momento bloccate dallo staff
          {cliente.motivo_blocco ? `: ${cliente.motivo_blocco}` : '.'}
        </p>
      )}

      {certificatoNonValido && !cliente.prenotazioni_bloccate && (
        <p className="avviso avviso-alert">
          Il tuo certificato medico è scaduto: non puoi prenotare da solo finché non lo
          rinnovi. Contatta lo staff, può farlo per te.
        </p>
      )}

      {error && <p className="errore-form">Errore: {error}</p>}
      {loading && <p className="hint">Caricamento…</p>}
      {!loading && occorrenze.length === 0 && (
        <p className="hint">Nessuna attività disponibile al momento.</p>
      )}

      {!loading && occorrenze.length > 0 && macrocategorie.length > 0 && (
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

      <div className="attivita-list">
        {occorrenze
          .filter((o) => {
            if (schedaMacro === 'tutte') return true
            const macroSet = macroPerAttivita.get(o.id)
            if (schedaMacro === 'senza-categoria') return !macroSet || macroSet.size === 0
            return macroSet && macroSet.has(schedaMacro)
          })
          .map((o) => {
          const giaPrenotata = prenotateIds.has(o.id)
          const giaInCoda = inCodaIds.has(o.id)
          const piena = o.posti_disponibili === 0
          const prenotabile =
            !giaPrenotata &&
            !giaInCoda &&
            o.prenotabile_ora &&
            o.posti_disponibili > 0 &&
            !cliente.prenotazioni_bloccate &&
            !certificatoNonValido
          const puoMettersInCoda =
            !giaPrenotata &&
            !giaInCoda &&
            o.prenotabile_ora &&
            piena &&
            !cliente.prenotazioni_bloccate &&
            !certificatoNonValido
          const inLoading = prenotando === o.id

          return (
            <div className="attivita-card" key={o.id}>
              <div className="attivita-card-data">
                <span className="attivita-card-giorno">{formattaData(o.data)}</span>
                <span className="attivita-card-ora">
                  {formattaOra(o.ora_inizio)}–{formattaOra(o.ora_fine)}
                </span>
              </div>

              <div className="attivita-card-body">
                <h2>{o.nome}</h2>
                <p className="attivita-card-posti">
                  {o.posti_disponibili > 0
                    ? `${o.posti_disponibili} posti disponibili`
                    : 'Al completo'}
                </p>

                {!o.prenotabile_ora && o.posti_disponibili > 0 && (
                  <p className="hint">Le prenotazioni non sono ancora aperte o sono già chiuse.</p>
                )}

                {giaInCoda && (
                  <p className="hint">
                    Sei in lista d'attesa
                    {posizioni.has(o.id) && posizioni.get(o.id) > 1
                      ? ` · hai ${posizioni.get(o.id) - 1} client${posizioni.get(o.id) - 1 === 1 ? 'e' : 'i'} davanti`
                      : ' · sei il prossimo in coda'}
                  </p>
                )}

                {esito?.id === o.id && esito.tipo === 'ok' && (
                  <p className="avviso avviso-ok">Prenotazione confermata!</p>
                )}
                {esito?.id === o.id && esito.tipo === 'coda' && (
                  <p className="avviso avviso-ok">Sei stato messo in lista d'attesa.</p>
                )}
                {esito?.id === o.id && esito.tipo === 'errore' && (
                  <p className="avviso avviso-alert">{esito.messaggio}</p>
                )}

                {piena && !giaPrenotata ? (
                  <button
                    className="btn-secondary attivita-card-btn"
                    disabled={!puoMettersInCoda || inLoading}
                    onClick={() => prenota(o, 'in_coda')}
                  >
                    {inLoading ? 'Attendere…' : giaInCoda ? 'In lista d\'attesa' : 'Mettiti in lista d\'attesa'}
                  </button>
                ) : (
                  <button
                    className="btn-primary attivita-card-btn"
                    disabled={!prenotabile || inLoading}
                    onClick={() => prenota(o)}
                  >
                    {inLoading ? 'Prenoto…' : giaPrenotata ? 'Già prenotato ✓' : 'Prenota'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
