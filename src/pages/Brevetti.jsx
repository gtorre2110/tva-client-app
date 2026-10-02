import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useBozza } from '../lib/useBozza'
import { formattaDataConAnno, certificatoScaduto } from '../lib/util'
import { ordinaBrevetti } from '../lib/brevetti'
import { caricaImmagine } from '../lib/upload'
import { ePdf, convertiPrimaPaginaPdfInPng } from '../lib/convertiPdf'
import './Brevetti.css'

const VUOTO = {
  tipo_brevetto_id: '',
  didattica_libera: '',
  tipo_brevetto_libero: '',
  livello_libero: '',
  istruttore_id: '',
  istruttore_nome_libero: '',
  numero_brevetto: '',
  data_emissione: '',
  scadenza: '',
}

export default function Brevetti({ cliente }) {
  const [brevetti, setBrevetti] = useState([])
  const [tipi, setTipi] = useState([])
  const [istruttori, setIstruttori] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [formAperto, setFormAperto] = useState(false)
  const [form, setForm, pulisciBozza] = useBozza(`brevetto-nuovo-${cliente.id}`, VUOTO)
  const [salvataggio, setSalvataggio] = useState(false)
  const [caricandoImmagine, setCaricandoImmagine] = useState(null)
  const [impostandoRiferimento, setImpostandoRiferimento] = useState(null)

  useEffect(() => {
    carica()
  }, [])

  async function caricaImmagineBrevetto(brevettoId, file) {
    if (!file) return
    setCaricandoImmagine(brevettoId)
    setError(null)

    try {
      // Un PDF (es. scansione) viene convertito subito in PNG: così resta
      // sempre mostrabile come immagine, sia nella scheda sia nel PDF del
      // registro immersioni che lo staff genera a parte.
      const fileDaCaricare = (await ePdf(file)) ? await convertiPrimaPaginaPdfInPng(file) : file
      const estensione = fileDaCaricare.name.split('.').pop()

      const { url, error: uploadError } = await caricaImmagine(
        'immagini-brevetti',
        `${cliente.id}/brevetto-${brevettoId}.${estensione}`,
        fileDaCaricare
      )

      if (uploadError) {
        setError(uploadError.message)
      } else {
        await supabase.from('brevetti').update({ immagine_url: url }).eq('id', brevettoId)
        carica()
      }
    } catch (err) {
      setError('Errore nella conversione/caricamento del file: ' + err.message)
    }
    setCaricandoImmagine(null)
  }

  // Quando il cliente ha più di un brevetto, può indicare quale sia "quello
  // da usare" (es. nel registro pre-evento, prima che un logbook lo
  // determini da solo). Un indice unico lato DB garantisce che resti
  // sempre uno solo: lo togliamo prima dagli altri e poi lo impostiamo qui.
  async function impostaRiferimento(brevettoId) {
    setImpostandoRiferimento(brevettoId)
    setError(null)
    await supabase
      .from('brevetti')
      .update({ brevetto_riferimento: false })
      .eq('cliente_id', cliente.id)
      .neq('id', brevettoId)
    const { error: updError } = await supabase
      .from('brevetti')
      .update({ brevetto_riferimento: true })
      .eq('id', brevettoId)
    if (updError) setError(updError.message)
    else carica()
    setImpostandoRiferimento(null)
  }

  async function carica() {
    setLoading(true)
    setError(null)

    const [{ data: mieBrevetti, error: e1 }, { data: tipiData }, { data: istrData }] =
      await Promise.all([
        supabase
          .from('brevetti')
          .select('*, tipi_brevetto(didattica, tipo_brevetto, livello, immagine_url), istruttori(nome, didattica)')
          .eq('cliente_id', cliente.id)
          .order('data_emissione', { ascending: false }),
        supabase.from('tipi_brevetto').select('*').order('didattica').order('tipo_brevetto'),
        supabase.from('istruttori').select('*').order('nome'),
      ])

    if (e1) setError(e1.message)
    setBrevetti(ordinaBrevetti(mieBrevetti || []))
    setTipi(tipiData || [])
    setIstruttori(istrData || [])
    setLoading(false)
  }

  function aggiorna(campo, valore) {
    setForm((prev) => ({ ...prev, [campo]: valore }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const usaCatalogoTipo = !!form.tipo_brevetto_id
    const usaCatalogoIstruttore = !!form.istruttore_id

    const payload = {
      cliente_id: cliente.id,
      tipo_brevetto_id: usaCatalogoTipo ? form.tipo_brevetto_id : null,
      didattica_libera: usaCatalogoTipo ? null : form.didattica_libera.trim() || null,
      tipo_brevetto_libero: usaCatalogoTipo ? null : form.tipo_brevetto_libero.trim() || null,
      livello_libero: usaCatalogoTipo ? null : form.livello_libero.trim() || null,
      istruttore_id: usaCatalogoIstruttore ? form.istruttore_id : null,
      istruttore_nome_libero: usaCatalogoIstruttore ? null : form.istruttore_nome_libero.trim() || null,
      numero_brevetto: form.numero_brevetto.trim() || null,
      data_emissione: form.data_emissione || null,
      scadenza: form.scadenza || null,
    }

    const { error: insertError } = await supabase.from('brevetti').insert(payload)
    setSalvataggio(false)

    if (insertError) {
      setError(insertError.message)
    } else {
      pulisciBozza()
      setFormAperto(false)
      carica()
    }
  }

  return (
    <div>
      <h1 className="page-title">Brevetti</h1>

      {error && <p className="errore-form">Errore: {error}</p>}
      {loading && <p className="hint">Caricamento…</p>}
      {!loading && brevetti.length === 0 && (
        <p className="hint">Non hai ancora registrato nessun brevetto.</p>
      )}

      <div className="brevetti-list">
        {brevetti.map((b) => {
          const didattica = b.tipi_brevetto?.didattica || b.didattica_libera
          const tipo = b.tipi_brevetto?.tipo_brevetto || b.tipo_brevetto_libero
          const istruttore = b.istruttori?.nome || b.istruttore_nome_libero
          const scaduto = certificatoScaduto(b.scadenza)
          const immagine = b.tipi_brevetto?.immagine_url || b.immagine_url
          const immaginePdf = (immagine || '').toLowerCase().endsWith('.pdf')

          return (
            <div className="brevetto-card" key={b.id}>
              {immagine && !immaginePdf && <img src={immagine} alt="" className="brevetto-immagine" />}
              {immagine && immaginePdf && (
                <a href={immagine} target="_blank" rel="noreferrer" className="brevetto-pdf-link">
                  Apri il PDF del brevetto
                </a>
              )}
              <h2>{[didattica, tipo].filter(Boolean).join(' — ') || 'Brevetto'}</h2>
              {b.numero_brevetto && <p className="brevetto-riga">N. {b.numero_brevetto}</p>}
              {istruttore && <p className="brevetto-riga">Istruttore: {istruttore}</p>}
              <p className="brevetto-riga">
                Emesso: {formattaDataConAnno(b.data_emissione)}
                {b.scadenza && ` · Scadenza: ${formattaDataConAnno(b.scadenza)}`}
              </p>
              {scaduto && <span className="badge badge-alert">Scaduto</span>}

              {brevetti.length > 1 && (
                b.brevetto_riferimento ? (
                  <span className="badge badge-riferimento">★ Brevetto principale</span>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary brevetto-riferimento-btn"
                    onClick={() => impostaRiferimento(b.id)}
                    disabled={impostandoRiferimento === b.id}
                  >
                    {impostandoRiferimento === b.id ? 'Imposto…' : 'Imposta come principale'}
                  </button>
                )
              )}

              {!immagine && (
                <label className="brevetto-carica-immagine">
                  {caricandoImmagine === b.id ? 'Carico…' : 'Carica una foto o un PDF del brevetto'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    hidden
                    disabled={caricandoImmagine === b.id}
                    onChange={(e) => caricaImmagineBrevetto(b.id, e.target.files[0])}
                  />
                </label>
              )}
            </div>
          )
        })}
      </div>

      {!formAperto && (
        <button className="btn-primary brevetti-add-btn" onClick={() => setFormAperto(true)}>
          + Aggiungi brevetto
        </button>
      )}

      {formAperto && (
        <form onSubmit={handleSubmit} className="brevetto-form">
          <h2>Nuovo brevetto</h2>

          <div className="campo">
            <label htmlFor="tipo">Tipo di brevetto (se in elenco)</label>
            <select
              id="tipo"
              value={form.tipo_brevetto_id}
              onChange={(e) => aggiorna('tipo_brevetto_id', e.target.value)}
            >
              <option value="">Non in elenco / preferisco scrivere</option>
              {tipi.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.didattica} — {t.tipo_brevetto} {t.livello ? `(${t.livello})` : ''}
                </option>
              ))}
            </select>
          </div>

          {!form.tipo_brevetto_id && (
            <>
              <p className="hint">La tua didattica non è in elenco? Scrivila qui:</p>
              <div className="campo">
                <label htmlFor="didattica_libera">Didattica</label>
                <input
                  id="didattica_libera"
                  value={form.didattica_libera}
                  onChange={(e) => aggiorna('didattica_libera', e.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="tipo_libero">Tipo di brevetto</label>
                <input
                  id="tipo_libero"
                  value={form.tipo_brevetto_libero}
                  onChange={(e) => aggiorna('tipo_brevetto_libero', e.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="livello_libero">Livello</label>
                <input
                  id="livello_libero"
                  value={form.livello_libero}
                  onChange={(e) => aggiorna('livello_libero', e.target.value)}
                />
              </div>
            </>
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
            <label htmlFor="numero">Numero del tuo brevetto</label>
            <input
              id="numero"
              value={form.numero_brevetto}
              onChange={(e) => aggiorna('numero_brevetto', e.target.value)}
            />
          </div>

          <div className="brevetti-row">
            <div className="campo">
              <label htmlFor="emissione">Data emissione</label>
              <input
                id="emissione"
                type="date"
                value={form.data_emissione}
                onChange={(e) => aggiorna('data_emissione', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="scadenza">Scadenza (se prevista)</label>
              <input
                id="scadenza"
                type="date"
                value={form.scadenza}
                onChange={(e) => aggiorna('scadenza', e.target.value)}
              />
            </div>
          </div>

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
