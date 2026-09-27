import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useBozza } from '../lib/useBozza'
import { formattaDataConAnno } from '../lib/util'
import { scaricaCSV } from '../lib/csv'
import { stampaLogbook } from '../lib/stampaLogbook'
import BottoneDrive from '../components/BottoneDrive'
import './Brevetti.css'
import './Logbook.css'

const VUOTO = {
  data: '',
  ora_inizio: '',
  ora_fine: '',
  localita_id: '',
  luogo: '',
  centro_immersione_id: '',
  centro_immersione_libero: '',
  istruttore_id: '',
  istruttore_nome_libero: '',
  brevetto_id: '',
  tipo_autorespiratore: '',
  miscela_utilizzata: '',
  profondita_programmata: '',
  profondita_raggiunta: '',
  corso: '',
  note: '',
}

export default function Logbook({ cliente }) {
  const [voci, setVoci] = useState([])
  const [istruttori, setIstruttori] = useState([])
  const [localita, setLocalita] = useState([])
  const [centri, setCentri] = useState([])
  const [brevetti, setBrevetti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formAperto, setFormAperto] = useState(false)
  const [form, setForm, pulisciBozza] = useBozza(`logbook-nuovo-${cliente.id}`, VUOTO)
  const [salvataggio, setSalvataggio] = useState(false)

  useEffect(() => {
    carica()
  }, [])

  async function carica() {
    setLoading(true)
    setError(null)

    const [
      { data: mieVoci, error: e1 },
      { data: istrData },
      { data: locData },
      { data: centriData },
      { data: brevettiData },
    ] = await Promise.all([
      supabase
        .from('logbook')
        .select('*, istruttori(nome), localita_immersione(nome), centri_immersione(nome), brevetti(numero_brevetto, tipi_brevetto(didattica, tipo_brevetto), tipo_brevetto_libero, didattica_libera)')
        .eq('cliente_id', cliente.id)
        .order('data', { ascending: false }),
      supabase.from('istruttori').select('*').order('nome'),
      supabase.from('localita_immersione').select('*').order('nome'),
      supabase.from('centri_immersione').select('*').order('nome'),
      supabase.from('brevetti').select('*, tipi_brevetto(didattica, tipo_brevetto)').eq('cliente_id', cliente.id),
    ])

    if (e1) setError(e1.message)
    setVoci(mieVoci || [])
    setIstruttori(istrData || [])
    setLocalita(locData || [])
    setCentri(centriData || [])
    setBrevetti(brevettiData || [])
    setLoading(false)
  }

  function aggiorna(campo, valore) {
    setForm((prev) => ({ ...prev, [campo]: valore }))
  }

  function descrizioneBrevetto(b) {
    const didattica = b.tipi_brevetto?.didattica || b.didattica_libera
    const tipo = b.tipi_brevetto?.tipo_brevetto || b.tipo_brevetto_libero
    return [didattica, tipo].filter(Boolean).join(' — ') || 'Brevetto'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const usaCatalogoIstruttore = !!form.istruttore_id
    const usaCatalogoLocalita = !!form.localita_id
    const usaCatalogoCentro = !!form.centro_immersione_id

    const payload = {
      cliente_id: cliente.id,
      data: form.data,
      ora_inizio: form.ora_inizio || null,
      ora_fine: form.ora_fine || null,
      localita_id: usaCatalogoLocalita ? form.localita_id : null,
      luogo: usaCatalogoLocalita ? null : form.luogo.trim() || null,
      centro_immersione_id: usaCatalogoCentro ? form.centro_immersione_id : null,
      centro_immersione_libero: usaCatalogoCentro ? null : form.centro_immersione_libero.trim() || null,
      istruttore_id: usaCatalogoIstruttore ? form.istruttore_id : null,
      istruttore_nome_libero: usaCatalogoIstruttore ? null : form.istruttore_nome_libero.trim() || null,
      brevetto_id: form.brevetto_id || null,
      tipo_autorespiratore: form.tipo_autorespiratore.trim() || null,
      miscela_utilizzata: form.miscela_utilizzata.trim() || null,
      profondita_programmata: form.profondita_programmata === '' ? null : Number(form.profondita_programmata),
      profondita_raggiunta: form.profondita_raggiunta === '' ? null : Number(form.profondita_raggiunta),
      corso: form.corso.trim() || null,
      note: form.note.trim() || null,
    }

    const { error: insertError } = await supabase.from('logbook').insert(payload)
    setSalvataggio(false)

    if (insertError) {
      setError(insertError.message)
    } else {
      pulisciBozza()
      setFormAperto(false)
      carica()
    }
  }

  const colonneCSV = [
    { chiave: 'data', etichetta: 'Data' },
    { chiave: 'ora_inizio', etichetta: 'Ora inizio' },
    { chiave: 'ora_fine', etichetta: 'Ora fine' },
    { chiave: 'luogo', etichetta: 'Luogo' },
    { chiave: 'centro', etichetta: 'Centro di immersione' },
    { chiave: 'istruttore', etichetta: 'Istruttore' },
    { chiave: 'tipo_autorespiratore', etichetta: 'Autorespiratore' },
    { chiave: 'miscela_utilizzata', etichetta: 'Miscela' },
    { chiave: 'profondita_programmata', etichetta: 'Profondità programmata (m)' },
    { chiave: 'profondita_raggiunta', etichetta: 'Profondità raggiunta (m)' },
    { chiave: 'corso', etichetta: 'Corso' },
    { chiave: 'note', etichetta: 'Note' },
    { chiave: 'confermata', etichetta: 'Confermata' },
  ]

  const righeCSV = voci.map((v) => ({
    ...v,
    luogo: v.localita_immersione?.nome || v.luogo || '',
    centro: v.centri_immersione?.nome || v.centro_immersione_libero || '',
    istruttore: v.istruttori?.nome || v.istruttore_nome_libero || '',
    confermata: v.confermato_da_istruttore ? 'Sì' : 'No',
  }))

  function esportaCSV() {
    scaricaCSV('logbook.csv', colonneCSV, righeCSV)
  }

  function esportaStampa() {
    stampaLogbook(cliente, voci, formattaDataConAnno)
  }

  return (
    <div>
      <h1 className="page-title">Logbook</h1>

      {voci.length > 0 && (
        <div className="logbook-export">
          <button className="btn-secondary" onClick={esportaCSV}>
            Scarica CSV
          </button>
          <button className="btn-secondary" onClick={esportaStampa}>
            Scarica come schede (stampa/PDF)
          </button>
          <BottoneDrive nomeFile="logbook.csv" colonne={colonneCSV} righe={righeCSV} />
        </div>
      )}

      {error && <p className="errore-form">Errore: {error}</p>}
      {loading && <p className="hint">Caricamento…</p>}
      {!loading && voci.length === 0 && (
        <p className="hint">Non hai ancora registrato nessuna uscita.</p>
      )}

      <div className="brevetti-list">
        {voci.map((v) => (
          <div className="brevetto-card" key={v.id}>
            <h2>{formattaDataConAnno(v.data)}</h2>
            {(v.ora_inizio || v.ora_fine) && (
              <p className="brevetto-riga">
                Orario: {v.ora_inizio?.slice(0, 5) || '—'}–{v.ora_fine?.slice(0, 5) || '—'}
              </p>
            )}
            {(v.localita_immersione?.nome || v.luogo) && (
              <p className="brevetto-riga">Luogo: {v.localita_immersione?.nome || v.luogo}</p>
            )}
            {(v.centri_immersione?.nome || v.centro_immersione_libero) && (
              <p className="brevetto-riga">Centro: {v.centri_immersione?.nome || v.centro_immersione_libero}</p>
            )}
            {(v.istruttori?.nome || v.istruttore_nome_libero) && (
              <p className="brevetto-riga">
                Istruttore: {v.istruttori?.nome || v.istruttore_nome_libero}
              </p>
            )}
            {v.brevetti && <p className="brevetto-riga">Brevetto: {descrizioneBrevetto(v.brevetti)}</p>}
            {(v.tipo_autorespiratore || v.miscela_utilizzata) && (
              <p className="brevetto-riga">
                {v.tipo_autorespiratore && `Autorespiratore: ${v.tipo_autorespiratore}`}
                {v.tipo_autorespiratore && v.miscela_utilizzata && ' · '}
                {v.miscela_utilizzata && `Miscela: ${v.miscela_utilizzata}`}
              </p>
            )}
            {(v.profondita_programmata || v.profondita_raggiunta) && (
              <p className="brevetto-riga">
                Profondità: {v.profondita_programmata ? `${v.profondita_programmata}m programmata` : ''}
                {v.profondita_programmata && v.profondita_raggiunta && ' · '}
                {v.profondita_raggiunta ? `${v.profondita_raggiunta}m raggiunta` : ''}
              </p>
            )}
            {v.corso && <p className="brevetto-riga">Corso: {v.corso}</p>}
            {v.note && <p className="brevetto-riga logbook-note">{v.note}</p>}
            <span className={'badge ' + (v.confermato_da_istruttore ? 'badge-ok' : 'badge-neutro')}>
              {v.confermato_da_istruttore ? 'Confermata dall\'istruttore' : 'Da confermare'}
            </span>
          </div>
        ))}
      </div>

      {!formAperto && (
        <button className="btn-primary brevetti-add-btn" onClick={() => setFormAperto(true)}>
          + Aggiungi uscita
        </button>
      )}

      {formAperto && (
        <form onSubmit={handleSubmit} className="brevetto-form">
          <h2>Nuova uscita</h2>

          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="data">Data</label>
              <input
                id="data"
                type="date"
                value={form.data}
                onChange={(e) => aggiorna('data', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="ora_inizio">Orario inizio</label>
              <input
                id="ora_inizio"
                type="time"
                value={form.ora_inizio}
                onChange={(e) => aggiorna('ora_inizio', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="ora_fine">Orario fine</label>
              <input
                id="ora_fine"
                type="time"
                value={form.ora_fine}
                onChange={(e) => aggiorna('ora_fine', e.target.value)}
              />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="localita">Località (se in elenco)</label>
            <select
              id="localita"
              value={form.localita_id}
              onChange={(e) => aggiorna('localita_id', e.target.value)}
            >
              <option value="">Non in elenco / preferisco scrivere</option>
              {localita.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>
          {!form.localita_id && (
            <div className="campo">
              <label htmlFor="luogo">Luogo</label>
              <input id="luogo" value={form.luogo} onChange={(e) => aggiorna('luogo', e.target.value)} />
            </div>
          )}

          <div className="campo">
            <label htmlFor="centro">Centro di immersione (se in elenco)</label>
            <select
              id="centro"
              value={form.centro_immersione_id}
              onChange={(e) => aggiorna('centro_immersione_id', e.target.value)}
            >
              <option value="">Non in elenco / preferisco scrivere</option>
              {centri.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          {!form.centro_immersione_id && (
            <div className="campo">
              <label htmlFor="centro_libero">Nome centro</label>
              <input
                id="centro_libero"
                value={form.centro_immersione_libero}
                onChange={(e) => aggiorna('centro_immersione_libero', e.target.value)}
              />
            </div>
          )}

          <div className="campo">
            <label htmlFor="istruttore">Istruttore (se in elenco)</label>
            <select
              id="istruttore"
              value={form.istruttore_id}
              onChange={(e) => aggiorna('istruttore_id', e.target.value)}
            >
              <option value="">Non in elenco / preferisco scrivere</option>
              {istruttori.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome} ({i.didattica})
                </option>
              ))}
            </select>
          </div>
          {!form.istruttore_id && (
            <div className="campo">
              <label htmlFor="istruttore_libero">Nome istruttore</label>
              <input
                id="istruttore_libero"
                value={form.istruttore_nome_libero}
                onChange={(e) => aggiorna('istruttore_nome_libero', e.target.value)}
              />
            </div>
          )}

          <div className="campo">
            <label htmlFor="brevetto">Brevetto posseduto (tra i tuoi)</label>
            <select
              id="brevetto"
              value={form.brevetto_id}
              onChange={(e) => aggiorna('brevetto_id', e.target.value)}
            >
              <option value="">Non specificato</option>
              {brevetti.map((b) => (
                <option key={b.id} value={b.id}>
                  {descrizioneBrevetto(b)}
                </option>
              ))}
            </select>
          </div>

          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="autorespiratore">Tipo di autorespiratore</label>
              <input
                id="autorespiratore"
                value={form.tipo_autorespiratore}
                onChange={(e) => aggiorna('tipo_autorespiratore', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="miscela">Miscela utilizzata</label>
              <input
                id="miscela"
                value={form.miscela_utilizzata}
                onChange={(e) => aggiorna('miscela_utilizzata', e.target.value)}
              />
            </div>
          </div>

          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="prof_prog">Profondità programmata (m)</label>
              <input
                id="prof_prog"
                type="number"
                step="0.1"
                value={form.profondita_programmata}
                onChange={(e) => aggiorna('profondita_programmata', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="prof_rag">Profondità raggiunta (m)</label>
              <input
                id="prof_rag"
                type="number"
                step="0.1"
                value={form.profondita_raggiunta}
                onChange={(e) => aggiorna('profondita_raggiunta', e.target.value)}
              />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="corso">Corso (se pertinente)</label>
            <input id="corso" value={form.corso} onChange={(e) => aggiorna('corso', e.target.value)} />
          </div>

          <div className="campo">
            <label htmlFor="note">Note</label>
            <input id="note" value={form.note} onChange={(e) => aggiorna('note', e.target.value)} />
          </div>

          <p className="hint">
            La conferma dell'istruttore viene registrata dallo staff, non è auto-dichiarabile.
          </p>

          {error && <p className="errore-form">{error}</p>}

          <div className="brevetti-form-actions">
            <button type="button" className="btn-secondary" onClick={() => setFormAperto(false)}>
              Annulla
            </button>
            <button type="submit" className="btn-primary" disabled={salvataggio}>
              {salvataggio ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
