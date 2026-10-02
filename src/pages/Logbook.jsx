import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useBozza } from '../lib/useBozza'
import { formattaDataConAnno } from '../lib/util'
import { scaricaCSV } from '../lib/csv'
import { stampaLogbook } from '../lib/stampaLogbook'
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
  profondita_programmata: '',
  profondita_raggiunta: '',
  corso: '',
  note: '',
  numero_uscita: '',
  specchio_acqua: '',
  coordinate_lat: '',
  coordinate_long: '',
  compagno_immersione: '',
  condizioni_cielo: '',
  condizioni_superficie: '',
  visibilita: '',
  temperatura_acqua: '',
  temperatura_aria: '',
  numero_tuffi: '',
  tempo_max_immersione: '',
  profondita_min_raggiunta: '',
  assetto: '',
  muta_giacca_mm: '',
  muta_pantaloni_mm: '',
  muta_bermuda_mm: '',
  guanti_mm: '',
  calzari_mm: '',
  zavorra_kg: '',
  pinne: '',
  usa_computer_orologio: false,
  usa_coltello_tagliasagole: false,
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
  const [modificaId, setModificaId] = useState(null)

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

  function apriModifica(v) {
    setModificaId(v.id)
    setForm({
      data: v.data || '',
      ora_inizio: v.ora_inizio || '',
      ora_fine: v.ora_fine || '',
      localita_id: v.localita_id || '',
      luogo: v.luogo || '',
      centro_immersione_id: v.centro_immersione_id || '',
      centro_immersione_libero: v.centro_immersione_libero || '',
      istruttore_id: v.istruttore_id || '',
      istruttore_nome_libero: v.istruttore_nome_libero || '',
      brevetto_id: v.brevetto_id || '',
      profondita_programmata: v.profondita_programmata ?? '',
      profondita_raggiunta: v.profondita_raggiunta ?? '',
      corso: v.corso || '',
      note: v.note || '',
      numero_uscita: v.numero_uscita ?? '',
      specchio_acqua: v.specchio_acqua || '',
      coordinate_lat: v.coordinate_lat || '',
      coordinate_long: v.coordinate_long || '',
      compagno_immersione: v.compagno_immersione || '',
      condizioni_cielo: v.condizioni_cielo || '',
      condizioni_superficie: v.condizioni_superficie || '',
      visibilita: v.visibilita || '',
      temperatura_acqua: v.temperatura_acqua ?? '',
      temperatura_aria: v.temperatura_aria ?? '',
      numero_tuffi: v.numero_tuffi ?? '',
      tempo_max_immersione: v.tempo_max_immersione || '',
      profondita_min_raggiunta: v.profondita_min_raggiunta ?? '',
      assetto: v.assetto || '',
      muta_giacca_mm: v.muta_giacca_mm ?? '',
      muta_pantaloni_mm: v.muta_pantaloni_mm ?? '',
      muta_bermuda_mm: v.muta_bermuda_mm ?? '',
      guanti_mm: v.guanti_mm ?? '',
      calzari_mm: v.calzari_mm ?? '',
      zavorra_kg: v.zavorra_kg ?? '',
      pinne: v.pinne || '',
      usa_computer_orologio: !!v.usa_computer_orologio,
      usa_coltello_tagliasagole: !!v.usa_coltello_tagliasagole,
    })
    setFormAperto(true)
  }

  function annullaForm() {
    if (modificaId) {
      pulisciBozza()
      setModificaId(null)
    }
    setFormAperto(false)
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
      profondita_programmata: form.profondita_programmata === '' ? null : Number(form.profondita_programmata),
      profondita_raggiunta: form.profondita_raggiunta === '' ? null : Number(form.profondita_raggiunta),
      corso: form.corso.trim() || null,
      note: form.note.trim() || null,
      numero_uscita: form.numero_uscita === '' ? null : Number(form.numero_uscita),
      specchio_acqua: form.specchio_acqua || null,
      coordinate_lat: form.coordinate_lat.trim() || null,
      coordinate_long: form.coordinate_long.trim() || null,
      compagno_immersione: form.compagno_immersione.trim() || null,
      condizioni_cielo: form.condizioni_cielo || null,
      condizioni_superficie: form.condizioni_superficie || null,
      visibilita: form.visibilita || null,
      temperatura_acqua: form.temperatura_acqua === '' ? null : Number(form.temperatura_acqua),
      temperatura_aria: form.temperatura_aria === '' ? null : Number(form.temperatura_aria),
      numero_tuffi: form.numero_tuffi === '' ? null : Number(form.numero_tuffi),
      tempo_max_immersione: form.tempo_max_immersione.trim() || null,
      profondita_min_raggiunta: form.profondita_min_raggiunta === '' ? null : Number(form.profondita_min_raggiunta),
      assetto: form.assetto || null,
      muta_giacca_mm: form.muta_giacca_mm === '' ? null : Number(form.muta_giacca_mm),
      muta_pantaloni_mm: form.muta_pantaloni_mm === '' ? null : Number(form.muta_pantaloni_mm),
      muta_bermuda_mm: form.muta_bermuda_mm === '' ? null : Number(form.muta_bermuda_mm),
      guanti_mm: form.guanti_mm === '' ? null : Number(form.guanti_mm),
      calzari_mm: form.calzari_mm === '' ? null : Number(form.calzari_mm),
      zavorra_kg: form.zavorra_kg === '' ? null : Number(form.zavorra_kg),
      pinne: form.pinne.trim() || null,
      usa_computer_orologio: !!form.usa_computer_orologio,
      usa_coltello_tagliasagole: !!form.usa_coltello_tagliasagole,
    }

    const { error: salvataggioError } = modificaId
      ? await supabase
          .from('logbook')
          .update(payload)
          .eq('id', modificaId)
          .eq('confermato_da_istruttore', false)
      : await supabase.from('logbook').insert(payload)
    setSalvataggio(false)

    if (salvataggioError) {
      setError(salvataggioError.message)
    } else {
      pulisciBozza()
      setModificaId(null)
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
            {(v.profondita_programmata || v.profondita_raggiunta) && (
              <p className="brevetto-riga">
                Profondità: {v.profondita_programmata ? `${v.profondita_programmata}m programmata` : ''}
                {v.profondita_programmata && v.profondita_raggiunta && ' · '}
                {v.profondita_raggiunta ? `${v.profondita_raggiunta}m raggiunta` : ''}
              </p>
            )}
            {v.corso && <p className="brevetto-riga">Corso: {v.corso}</p>}
            {v.note && <p className="brevetto-riga logbook-note">{v.note}</p>}
            <div className="brevetto-card-piede">
              <span className={'badge ' + (v.confermato_da_istruttore ? 'badge-ok' : 'badge-neutro')}>
                {v.confermato_da_istruttore ? 'Confermata dall\'istruttore' : 'Da confermare'}
              </span>
              {!v.confermato_da_istruttore && !(formAperto && modificaId === v.id) && (
                <button className="btn-secondary" onClick={() => apriModifica(v)}>
                  Modifica
                </button>
              )}
            </div>
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
          <h2>{modificaId ? 'Modifica uscita' : 'Nuova uscita'}</h2>

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

          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="numero_uscita">N° Uscita</label>
              <input
                id="numero_uscita"
                type="number"
                value={form.numero_uscita}
                onChange={(e) => aggiorna('numero_uscita', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="specchio_acqua">Lago o mare</label>
              <select
                id="specchio_acqua"
                value={form.specchio_acqua}
                onChange={(e) => aggiorna('specchio_acqua', e.target.value)}
              >
                <option value="">Non specificato</option>
                <option value="lago">Lago</option>
                <option value="mare">Mare</option>
              </select>
            </div>
          </div>

          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="coordinate_lat">Coordinate Lat.</label>
              <input
                id="coordinate_lat"
                value={form.coordinate_lat}
                onChange={(e) => aggiorna('coordinate_lat', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="coordinate_long">Coordinate Long.</label>
              <input
                id="coordinate_long"
                value={form.coordinate_long}
                onChange={(e) => aggiorna('coordinate_long', e.target.value)}
              />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="compagno_immersione">Compagno/Guida/Istruttore</label>
            <input
              id="compagno_immersione"
              value={form.compagno_immersione}
              onChange={(e) => aggiorna('compagno_immersione', e.target.value)}
            />
          </div>

          <h3>Condizioni ambientali</h3>
          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="condizioni_cielo">Cielo</label>
              <select
                id="condizioni_cielo"
                value={form.condizioni_cielo}
                onChange={(e) => aggiorna('condizioni_cielo', e.target.value)}
              >
                <option value="">Non specificato</option>
                <option value="sereno">Sereno</option>
                <option value="velato">Velato</option>
                <option value="coperto">Coperto</option>
                <option value="pioggia">Pioggia</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor="condizioni_superficie">Superficie</label>
              <select
                id="condizioni_superficie"
                value={form.condizioni_superficie}
                onChange={(e) => aggiorna('condizioni_superficie', e.target.value)}
              >
                <option value="">Non specificato</option>
                <option value="calma">Calma</option>
                <option value="quasi_calma">Quasi calma</option>
                <option value="mossa">Mossa</option>
                <option value="molto_mossa">Molto mossa</option>
              </select>
            </div>
          </div>
          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="visibilita">Visibilità</label>
              <select
                id="visibilita"
                value={form.visibilita}
                onChange={(e) => aggiorna('visibilita', e.target.value)}
              >
                <option value="">Non specificato</option>
                <option value="buona">Buona</option>
                <option value="sufficiente">Sufficiente</option>
                <option value="scarsa">Scarsa</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor="temperatura_acqua">Temp. acqua (°C)</label>
              <input
                id="temperatura_acqua"
                type="number"
                step="0.1"
                value={form.temperatura_acqua}
                onChange={(e) => aggiorna('temperatura_acqua', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="temperatura_aria">Temp. aria (°C)</label>
              <input
                id="temperatura_aria"
                type="number"
                step="0.1"
                value={form.temperatura_aria}
                onChange={(e) => aggiorna('temperatura_aria', e.target.value)}
              />
            </div>
          </div>

          <h3>Attività svolta</h3>
          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="numero_tuffi">N. Tuffi svolti</label>
              <input
                id="numero_tuffi"
                type="number"
                value={form.numero_tuffi}
                onChange={(e) => aggiorna('numero_tuffi', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="tempo_max_immersione">Tempo max d'immersione</label>
              <input
                id="tempo_max_immersione"
                placeholder="es. 2:30"
                value={form.tempo_max_immersione}
                onChange={(e) => aggiorna('tempo_max_immersione', e.target.value)}
              />
            </div>
          </div>
          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="prof_min">Min profondità raggiunta (m)</label>
              <input
                id="prof_min"
                type="number"
                step="0.1"
                value={form.profondita_min_raggiunta}
                onChange={(e) => aggiorna('profondita_min_raggiunta', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="assetto">Assetto</label>
              <select
                id="assetto"
                value={form.assetto}
                onChange={(e) => aggiorna('assetto', e.target.value)}
              >
                <option value="">Non specificato</option>
                <option value="costante">Assetto costante</option>
                <option value="variabile">Assetto variabile</option>
                <option value="no_limits">No limits</option>
              </select>
            </div>
          </div>

          <h3>Attrezzatura utilizzata</h3>
          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="muta_giacca_mm">Giacca muta (mm)</label>
              <input
                id="muta_giacca_mm"
                type="number"
                value={form.muta_giacca_mm}
                onChange={(e) => aggiorna('muta_giacca_mm', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="muta_pantaloni_mm">Pantaloni muta (mm)</label>
              <input
                id="muta_pantaloni_mm"
                type="number"
                value={form.muta_pantaloni_mm}
                onChange={(e) => aggiorna('muta_pantaloni_mm', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="muta_bermuda_mm">Bermuda (mm)</label>
              <input
                id="muta_bermuda_mm"
                type="number"
                value={form.muta_bermuda_mm}
                onChange={(e) => aggiorna('muta_bermuda_mm', e.target.value)}
              />
            </div>
          </div>
          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="guanti_mm">Guanti (mm)</label>
              <input
                id="guanti_mm"
                type="number"
                value={form.guanti_mm}
                onChange={(e) => aggiorna('guanti_mm', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="calzari_mm">Calzari (mm)</label>
              <input
                id="calzari_mm"
                type="number"
                value={form.calzari_mm}
                onChange={(e) => aggiorna('calzari_mm', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="zavorra_kg">Zavorra (kg)</label>
              <input
                id="zavorra_kg"
                type="number"
                step="0.1"
                value={form.zavorra_kg}
                onChange={(e) => aggiorna('zavorra_kg', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="pinne">Pinne</label>
              <input
                id="pinne"
                value={form.pinne}
                onChange={(e) => aggiorna('pinne', e.target.value)}
              />
            </div>
          </div>
          <div className="brevetti-row">
            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={form.usa_computer_orologio}
                onChange={(e) => aggiorna('usa_computer_orologio', e.target.checked)}
              />
              Computer/Orologio
            </label>
            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={form.usa_coltello_tagliasagole}
                onChange={(e) => aggiorna('usa_coltello_tagliasagole', e.target.checked)}
              />
              Coltello/Tagliasagole
            </label>
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
            {modificaId
              ? "Puoi modificare questa uscita solo finché non viene confermata dall'istruttore."
              : "La conferma dell'istruttore viene registrata dallo staff, non è auto-dichiarabile."}
          </p>

          {error && <p className="errore-form">{error}</p>}

          <div className="brevetti-form-actions">
            <button type="button" className="btn-secondary" onClick={annullaForm}>
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
