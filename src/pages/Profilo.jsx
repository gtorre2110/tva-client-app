import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  formattaDataConAnno,
  certificatoScaduto,
  certificatoInScadenza,
  scadenzaIngressiAllenamenti,
} from '../lib/util'
import { caricaImmagine } from '../lib/upload'
import DatiPersonali from './DatiPersonali'
import Categorie from './Categorie'
import './Profilo.css'

export default function Profilo({ cliente }) {
  const scaduto = certificatoScaduto(cliente.scadenza_certificato_medico)
  const inScadenza = certificatoInScadenza(cliente.scadenza_certificato_medico)
  const danScaduto = certificatoScaduto(cliente.dan_scadenza)
  const danInScadenza = certificatoInScadenza(cliente.dan_scadenza)
  const fipsasScaduto = certificatoScaduto(cliente.fipsas_scadenza)
  const fipsasInScadenza = certificatoInScadenza(cliente.fipsas_scadenza)
  const [accettaEmail, setAccettaEmail] = useState(cliente.accetta_email || false)
  const [salvataggio, setSalvataggio] = useState(false)
  const [fotoUrl, setFotoUrl] = useState(cliente.foto_url || null)
  const [caricandoFoto, setCaricandoFoto] = useState(false)
  const [erroreFoto, setErroreFoto] = useState(null)
  const [scadenzaIngressi, setScadenzaIngressi] = useState(null)

  useEffect(() => {
    scadenzaIngressiAllenamenti(supabase, cliente.id).then(setScadenzaIngressi)
  }, [cliente.id])

  async function cambiaConsenso(e) {
    const valore = e.target.checked
    setAccettaEmail(valore)
    setSalvataggio(true)
    await supabase.from('clienti').update({ accetta_email: valore }).eq('id', cliente.id)
    setSalvataggio(false)
  }

  async function cambiaFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setCaricandoFoto(true)
    setErroreFoto(null)

    const estensione = file.name.split('.').pop()
    const { url, error } = await caricaImmagine('foto-clienti', `${cliente.id}/foto.${estensione}`, file)

    if (error) {
      setErroreFoto(error.message)
    } else {
      await supabase.from('clienti').update({ foto_url: url }).eq('id', cliente.id)
      setFotoUrl(url)
    }
    setCaricandoFoto(false)
  }

  return (
    <div>
      <h1 className="page-title">Profilo</h1>

      <div className="profilo-card">
        <div className="profilo-foto-wrap">
          {fotoUrl ? (
            <img src={fotoUrl} alt="Foto profilo" className="profilo-foto" />
          ) : (
            <div className="profilo-foto profilo-foto-vuota">
              {cliente.nome?.[0]}
              {cliente.cognome?.[0]}
            </div>
          )}
          <label className="profilo-foto-btn">
            {caricandoFoto ? 'Carico…' : 'Cambia foto'}
            <input type="file" accept="image/*" onChange={cambiaFoto} disabled={caricandoFoto} hidden />
          </label>
        </div>
        {erroreFoto && <p className="errore-form">{erroreFoto}</p>}

        <h2>
          {cliente.nome} {cliente.cognome}
        </h2>
        <p className="profilo-email">{cliente.email}</p>

        <div className="profilo-riga">
          <span>
            Ingressi disponibili
            {scadenzaIngressi && ` (scadenza: ${new Date(scadenzaIngressi).toLocaleDateString('it-IT')})`}
          </span>
          <strong className={cliente.ingressi_disponibili < 0 ? 'valore-alert' : ''}>
            {cliente.ingressi_disponibili}
          </strong>
        </div>

        <div className="profilo-riga">
          <span>Certificato medico</span>
          <strong className={scaduto ? 'valore-alert' : inScadenza ? 'valore-warning' : ''}>
            {formattaDataConAnno(cliente.scadenza_certificato_medico)}
          </strong>
        </div>

        {scaduto && (
          <p className="avviso avviso-alert">
            Il tuo certificato medico è scaduto. Contatta lo staff per aggiornarlo.
          </p>
        )}
        {!scaduto && inScadenza && (
          <p className="avviso avviso-warning">
            Il tuo certificato medico sta per scadere il{' '}
            {formattaDataConAnno(cliente.scadenza_certificato_medico)}.
          </p>
        )}

        {cliente.dan_scadenza && (
          <div className="profilo-riga">
            <span>Assicurazione DAN{cliente.dan_numero ? ` (n. ${cliente.dan_numero})` : ''}</span>
            <strong className={danScaduto ? 'valore-alert' : danInScadenza ? 'valore-warning' : ''}>
              {formattaDataConAnno(cliente.dan_scadenza)}
            </strong>
          </div>
        )}
        {danScaduto && (
          <p className="avviso avviso-alert">
            La tua assicurazione DAN è scaduta. Contatta lo staff per aggiornarla.
          </p>
        )}
        {!danScaduto && danInScadenza && (
          <p className="avviso avviso-warning">
            La tua assicurazione DAN sta per scadere il {formattaDataConAnno(cliente.dan_scadenza)}.
          </p>
        )}

        {cliente.fipsas_scadenza && (
          <div className="profilo-riga">
            <span>Tessera FIPSAS{cliente.fipsas_numero ? ` (n. ${cliente.fipsas_numero})` : ''}</span>
            <strong className={fipsasScaduto ? 'valore-alert' : fipsasInScadenza ? 'valore-warning' : ''}>
              {formattaDataConAnno(cliente.fipsas_scadenza)}
            </strong>
          </div>
        )}
        {fipsasScaduto && (
          <p className="avviso avviso-alert">
            La tua tessera FIPSAS è scaduta. Contatta lo staff per aggiornarla.
          </p>
        )}
        {!fipsasScaduto && fipsasInScadenza && (
          <p className="avviso avviso-warning">
            La tua tessera FIPSAS sta per scadere il {formattaDataConAnno(cliente.fipsas_scadenza)}.
          </p>
        )}

        {cliente.prenotazioni_bloccate && (
          <p className="avviso avviso-alert">
            Le tue prenotazioni sono bloccate dallo staff
            {cliente.motivo_blocco ? `: ${cliente.motivo_blocco}` : '.'}
          </p>
        )}

        <label className="profilo-consenso">
          <input type="checkbox" checked={accettaEmail} onChange={cambiaConsenso} disabled={salvataggio} />
          Voglio ricevere email (scadenza certificato, saldo ingressi, lista d'attesa)
        </label>
      </div>

      <Categorie cliente={cliente} />

      <DatiPersonali clienteId={cliente.id} />

      <button className="btn-secondary profilo-logout" onClick={() => supabase.auth.signOut()}>
        Esci
      </button>
    </div>
  )
}
