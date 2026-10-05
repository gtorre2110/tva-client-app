import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formattaOra, certificatoScaduto, scomponiData } from '../lib/util'
import './Attivita.css'
import './Prenotazioni.css'

export default function Attivita({ cliente }) {
  const certificatoNonValido = certificatoScaduto(cliente.scadenza_certificato_medico)
  const [occorrenze, setOccorrenze] = useState([])
  const [prenotazioniPerAttivita, setPrenotazioniPerAttivita] = useState(new Map())
  const [posizioni, setPosizioni] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inCorso, setInCorso] = useState(null)
  const [esito, setEsito] = useState(null)
  const [macrocategorie, setMacrocategorie] = useState([])
  const [macroPerAttivita, setMacroPerAttivita] = useState(new Map())
  const [macroNomiPerAttivita, setMacroNomiPerAttivita] = useState(new Map())
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
        .select('id, attivita_id, stato, tardiva')
        .eq('cliente_id', cliente.id)
        .in('stato', ['confermata', 'in_coda']),
    ])

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const mappaPrenotazioni = new Map((mieProp || []).map((p) => [p.attivita_id, p]))
    setPrenotazioniPerAttivita(mappaPrenotazioni)
    const codaIds = (mieProp || []).filter((p) => p.stato === 'in_coda').map((p) => p.attivita_id)

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
      setMacroNomiPerAttivita(new Map())
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
    const mappaMacroNomi = new Map()
    for (const [attivitaId, cats] of categoriePerAttivita.entries()) {
      for (const cid of cats) {
        const macroId = risolviMacro(cid)
        if (!macroId) continue
        if (!mappaMacro.has(attivitaId)) mappaMacro.set(attivitaId, new Set())
        mappaMacro.get(attivitaId).add(macroId)
        if (!mappaMacroNomi.has(attivitaId)) {
          mappaMacroNomi.set(attivitaId, categoriePerId.get(macroId)?.nome || '')
        }
      }
    }
    setMacroPerAttivita(mappaMacro)
    setMacroNomiPerAttivita(mappaMacroNomi)
    setMacrocategorie((categorie || []).filter((c) => !c.categoria_padre_id).sort((a, b) => a.nome.localeCompare(b.nome)))

    setOccorrenze(visibili)
    setLoading(false)
  }

  async function prenota(occorrenza, stato = 'confermata', tardiva = false) {
    if (prenotazioniPerAttivita.has(occorrenza.id)) return

    setInCorso(occorrenza.id)
    setEsito(null)

    const { error: insertError } = await supabase.from('prenotazioni').insert({
      attivita_id: occorrenza.id,
      cliente_id: cliente.id,
      nome: cliente.nome,
      cognome: cliente.cognome,
      stato,
      tardiva,
    })

    setInCorso(null)

    if (insertError) {
      const messaggio = insertError.code === '23505'
        ? 'Hai già una prenotazione (o sei già in lista d\'attesa) per questa attività.'
        : insertError.message
      setEsito({ tipo: 'errore', id: occorrenza.id, messaggio })
      if (insertError.code === '23505') carica()
    } else {
      setEsito({ tipo: tardiva ? (stato === 'in_coda' ? 'tardiva-coda' : 'tardiva') : stato === 'in_coda' ? 'coda' : 'ok', id: occorrenza.id })
      carica()
    }
  }

  async function annulla(occorrenza) {
    const p = prenotazioniPerAttivita.get(occorrenza.id)
    if (!p) return

    setInCorso(occorrenza.id)
    setEsito(null)

    const { data, error: updateError } = await supabase
      .from('prenotazioni')
      .update({ stato: 'annullata' })
      .eq('id', p.id)
      .select()

    setInCorso(null)

    if (updateError) {
      setEsito({ tipo: 'errore', id: occorrenza.id, messaggio: updateError.message })
    } else if (!data || data.length === 0) {
      setEsito({ tipo: 'errore', id: occorrenza.id, messaggio: 'Non è stato possibile annullare (nessuna riga modificata).' })
    } else {
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
          const mia = prenotazioniPerAttivita.get(o.id)
          const giaPrenotata = mia?.stato === 'confermata'
          const giaInCoda = mia?.stato === 'in_coda'
          const piena = o.posti_disponibili === 0
          const prenotabile =
            !mia &&
            o.prenotabile_ora &&
            o.posti_disponibili > 0 &&
            !cliente.prenotazioni_bloccate &&
            !certificatoNonValido
          const puoMettersInCoda =
            !mia &&
            o.prenotabile_ora &&
            piena &&
            !cliente.prenotazioni_bloccate &&
            !certificatoNonValido
          const tardiva = !mia && !o.prenotabile_ora && o.prenotabile_tardi
          const puoPrenotareTardi =
            tardiva &&
            !cliente.prenotazioni_bloccate &&
            !certificatoNonValido
          const puoAnnullare = (giaPrenotata || giaInCoda) && !cliente.prenotazioni_bloccate
          const inLoading = inCorso === o.id
          const { giorno, num, mese } = scomponiData(o.data)
          const macroNome = macroNomiPerAttivita.get(o.id)
          const tot = o.posti_massimi ?? o.posti_totali ?? null
          const pct = tot ? Math.round(((tot - o.posti_disponibili) / tot) * 100) : null

          let tag = null
          let tagClass = ''
          if (giaPrenotata) { tag = mia?.tardiva ? 'PRENOTATA · TARDIVA' : 'PRENOTATA'; tagClass = mia?.tardiva ? 'badge-warning' : 'badge-ok' }
          else if (giaInCoda) { tag = mia?.tardiva ? 'IN LISTA D\'ATTESA · TARDIVA' : 'IN LISTA D\'ATTESA'; tagClass = 'badge-warning' }
          else if (piena) { tag = 'COMPLETA'; tagClass = 'badge-neutro' }

          return (
            <article className="attivita-card" key={o.id}>
              <div className="attivita-card-data">
                <span className="attivita-card-giorno">{giorno}</span>
                <span className="attivita-card-num">{num}</span>
                <span className="attivita-card-mese">{mese}</span>
              </div>

              <div className="attivita-card-body">
                {macroNome && <div className="attivita-card-macro">{macroNome}</div>}
                <h2>{o.nome}</h2>
                <div className="attivita-card-meta">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
                  <span>{formattaOra(o.ora_inizio)}–{formattaOra(o.ora_fine)}</span>
                </div>

                {tot != null && (
                  <div className="attivita-card-posti-wrap">
                    <div className="attivita-card-barra">
                      <div
                        className="attivita-card-barra-riempita"
                        style={{ width: pct + '%', background: o.posti_disponibili === 0 ? 'var(--ink-soft)' : 'var(--accent)' }}
                      />
                    </div>
                    <p className="attivita-card-posti">
                      {o.posti_disponibili > 0
                        ? `${o.posti_disponibili} post${o.posti_disponibili === 1 ? 'o' : 'i'} disponibil${o.posti_disponibili === 1 ? 'e' : 'i'} su ${tot}`
                        : `Al completo (0 su ${tot})`}
                    </p>
                  </div>
                )}

                {tardiva && (
                  <p className="hint">
                    Le prenotazioni sono chiuse. Puoi registrare comunque la richiesta come prenotazione tardiva
                    {piena ? ' (l\'attività è al completo: andrai in fondo alla lista d\'attesa)' : ''}:
                    contatta lo staff per la conferma.
                  </p>
                )}
                {!tardiva && !o.prenotabile_ora && !mia && o.posti_disponibili > 0 && (
                  <p className="hint">Le prenotazioni non sono ancora aperte o sono già chiuse.</p>
                )}

                {giaInCoda && (
                  <p className="hint">
                    {posizioni.has(o.id) && posizioni.get(o.id) > 1
                      ? `Hai ${posizioni.get(o.id) - 1} client${posizioni.get(o.id) - 1 === 1 ? 'e' : 'i'} davanti`
                      : 'Sei il prossimo in coda'}
                  </p>
                )}

                {esito?.id === o.id && esito.tipo === 'ok' && (
                  <p className="avviso avviso-ok">Prenotazione confermata!</p>
                )}
                {esito?.id === o.id && esito.tipo === 'coda' && (
                  <p className="avviso avviso-ok">Sei stato messo in lista d'attesa.</p>
                )}
                {esito?.id === o.id && esito.tipo === 'tardiva' && (
                  <p className="avviso avviso-ok">Prenotazione tardiva registrata. Contatta lo staff per la conferma.</p>
                )}
                {esito?.id === o.id && esito.tipo === 'tardiva-coda' && (
                  <p className="avviso avviso-ok">Attività al completo: sei in fondo alla lista d'attesa (richiesta tardiva). Contatta lo staff per la conferma.</p>
                )}
                {esito?.id === o.id && esito.tipo === 'errore' && (
                  <p className="avviso avviso-alert">{esito.messaggio}</p>
                )}

                <div className="attivita-card-footer">
                  {tag && <span className={'badge ' + tagClass}>{tag}</span>}

                  {puoAnnullare ? (
                    <button
                      className="btn-secondary attivita-card-btn"
                      disabled={inLoading}
                      onClick={() => annulla(o)}
                    >
                      {inLoading ? 'Attendere…' : giaInCoda ? 'Esci dalla lista' : 'Annulla'}
                    </button>
                  ) : piena ? (
                    <button
                      className="btn-secondary attivita-card-btn"
                      disabled={!(puoMettersInCoda || puoPrenotareTardi) || inLoading}
                      onClick={() => prenota(o, 'in_coda', !o.prenotabile_ora)}
                    >
                      {inLoading ? 'Attendere…' : tardiva ? 'Lista d\'attesa (tardiva)' : 'Mettiti in lista d\'attesa'}
                    </button>
                  ) : (
                    <button
                      className="btn-primary attivita-card-btn"
                      disabled={!(prenotabile || puoPrenotareTardi) || inLoading}
                      onClick={() => prenota(o, 'confermata', !o.prenotabile_ora)}
                    >
                      {inLoading ? 'Prenoto…' : tardiva ? 'Prenota (tardiva)' : 'Prenota'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
