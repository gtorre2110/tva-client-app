import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './Categorie.css'
import './DatiPersonali.css'

export default function Categorie({ cliente }) {
  const [aperto, setAperto] = useState(false)
  const [tutte, setTutte] = useState([])
  const [collegate, setCollegate] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (aperto) carica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperto])

  async function carica() {
    setLoading(true)
    setError(null)
    const [{ data: categorie, error: e1 }, { data: righe, error: e2 }] = await Promise.all([
      supabase.from('categorie').select('*').order('nome'),
      supabase.from('clienti_categorie').select('categoria_id, confermata').eq('cliente_id', cliente.id),
    ])
    if (e1 || e2) setError((e1 || e2).message)
    else {
      setTutte(categorie)
      setCollegate(righe)
    }
    setLoading(false)
  }

  function statoDi(categoriaId) {
    const riga = collegate.find((c) => c.categoria_id === categoriaId)
    if (!riga) return 'neutro'
    return riga.confermata ? 'confermata' : 'richiesta'
  }

  async function richiedi(categoriaId) {
    setError(null)
    const { error: opError } = await supabase
      .from('clienti_categorie')
      .insert({ cliente_id: cliente.id, categoria_id: categoriaId, confermata: false })
    if (opError) setError(opError.message)
    else carica()
  }

  async function ritira(categoriaId) {
    setError(null)
    const { error: opError } = await supabase
      .from('clienti_categorie')
      .delete()
      .eq('cliente_id', cliente.id)
      .eq('categoria_id', categoriaId)
    if (opError) setError(opError.message)
    else carica()
  }

  // Tocco sulla macrocategoria: richiede tutte le figlie non ancora richieste,
  // oppure (se sono già tutte richieste/confermate) le ritira tutte insieme.
  async function toggleGruppo(figlie) {
    setError(null)
    const hannoTutteQualcosa = figlie.every((f) => statoDi(f.id) !== 'neutro')

    const operazioni = hannoTutteQualcosa
      ? figlie.map((f) =>
          supabase.from('clienti_categorie').delete().eq('cliente_id', cliente.id).eq('categoria_id', f.id)
        )
      : figlie
          .filter((f) => statoDi(f.id) === 'neutro')
          .map((f) =>
            supabase.from('clienti_categorie').insert({ cliente_id: cliente.id, categoria_id: f.id, confermata: false })
          )

    const risultati = await Promise.all(operazioni)
    const erroreTrovato = risultati.find((r) => r.error)
    if (erroreTrovato) setError(erroreTrovato.error.message)
    carica()
  }

  const macrocategorie = tutte.filter((c) => !c.categoria_padre_id)

  return (
    <div className="dati-personali-box">
      <button type="button" className="dati-personali-toggle" onClick={() => setAperto((v) => !v)}>
        Categorie {aperto ? '▲' : '▼'}
      </button>

      {aperto && (
        <div className="categorie-box-contenuto">
          <p className="hint categorie-intro">
            Indica a quali categorie di attività sei interessato. Lo staff dovrà confermarle
            prima che tu possa vedere e prenotare le attività riservate a quella categoria.
            Tocca il titolo di un gruppo per richiederle (o ritirarle) tutte insieme.
          </p>

          {error && <p className="errore-form">{error}</p>}
          {loading && <p className="hint">Caricamento…</p>}
          {!loading && tutte.length === 0 && <p className="hint">Nessuna categoria disponibile.</p>}

          <div className="categorie-gruppi">
            {macrocategorie.map((padre) => {
              const figlie = tutte.filter((c) => c.categoria_padre_id === padre.id)
              if (figlie.length === 0) {
                // Categoria senza sottocategorie: si comporta come una categoria singola, selezionabile
                const stato = statoDi(padre.id)
                return (
                  <CategoriaChip
                    key={padre.id}
                    nome={padre.nome}
                    stato={stato}
                    onRichiedi={() => richiedi(padre.id)}
                    onRitira={() => ritira(padre.id)}
                  />
                )
              }
              return (
                <div className="categorie-gruppo" key={padre.id}>
                  <button type="button" className="categorie-gruppo-titolo" onClick={() => toggleGruppo(figlie)}>
                    {padre.nome}
                  </button>
                  <div className="categorie-chips">
                    {figlie.map((f) => (
                      <CategoriaChip
                        key={f.id}
                        nome={f.nome}
                        stato={statoDi(f.id)}
                        onRichiedi={() => richiedi(f.id)}
                        onRitira={() => ritira(f.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoriaChip({ nome, stato, onRichiedi, onRitira }) {
  return (
    <span className={'chip-stato chip-stato-' + stato}>
      {stato === 'confermata' && (
        <>
          <span className="chip-stato-nome">{nome} ✓</span>
          <button type="button" className="chip-stato-azione" title="Togliti da questa categoria" onClick={onRitira}>
            ✕
          </button>
        </>
      )}
      {stato === 'richiesta' && (
        <>
          <span className="chip-stato-nome">{nome} · in attesa</span>
          <button type="button" className="chip-stato-azione" title="Ritira la richiesta" onClick={onRitira}>
            ✕
          </button>
        </>
      )}
      {stato === 'neutro' && (
        <button type="button" className="chip-stato-nome chip-stato-toggle" onClick={onRichiedi}>
          {nome}
        </button>
      )}
    </span>
  )
}
