import './Aiuto.css'

export default function Aiuto() {
  return (
    <div className="aiuto-page">
      <h1 className="page-title">Aiuto</h1>
      <p className="hint">Guida rapida alle funzioni dell'app.</p>

      <section>
        <h2>Il tuo profilo</h2>
        <p>È la schermata che si apre per prima. Mostra i tuoi dati, saldo ingressi, scadenza del certificato medico, e ti permette di caricare una foto e attivare/disattivare le email. Più sotto trovi due sezioni a comparsa: "Categorie" (a quali attività sei interessato: lo staff dovrà confermarle; le categorie sono raggruppate per macrocategoria, tocca il titolo di un gruppo per richiederle o ritirarle tutte insieme) e "Dati personali" (indirizzo, codice fiscale e altri dati facoltativi).</p>
      </section>

      <section>
        <h2>Attività</h2>
        <p>Le prossime attività disponibili, filtrabili per macrocategoria con le schede in alto. Se un'attività è al completo puoi metterti in lista d'attesa: se si libera un posto, la tua prenotazione si conferma da sola e ricevi un'email (se hai attivato il consenso). Se le prenotazioni sono chiuse ma l'attività non è ancora iniziata, puoi comunque registrare una richiesta "tardiva": se ci sono posti risulta prenotata, altrimenti vai in fondo alla lista d'attesa, e in entrambi i casi devi contattare lo staff per la conferma (lo staff decide chi è presente al check-in).</p>
      </section>

      <section>
        <h2>Le mie prenotazioni</h2>
        <p>Le tue prenotazioni, con un interruttore per mostrare anche quelle annullate e le schede per filtrarle per macrocategoria. Puoi annullare (o ritirarti dalla lista d'attesa) finché l'attività non è passata e non hai già fatto il check-in.</p>
      </section>

      <section>
        <h2>Brevetti</h2>
        <p>Registra i tuoi brevetti scegliendo da un catalogo (o scrivendo a mano se la tua didattica non c'è ancora). Con "Carica immagine del brevetto" puoi caricare l'immagine del tuo brevetto (una foto o un PDF): se lo fai viene mostrata al posto dell'immagine standard del catalogo, e puoi cambiarla o eliminarla quando vuoi. Se hai più brevetti, puoi indicare quale sia quello "principale": è quello che lo staff usa nei documenti del registro delle uscite.</p>
      </section>

      <section>
        <h2>Logbook</h2>
        <p>Registra le tue uscite/immersioni con tutti i dettagli richiesti dalla normativa. Puoi scaricare il tuo logbook in CSV o come schede pronte per la stampa/PDF. La conferma dell'istruttore la registra lo staff, non è auto-dichiarabile.</p>
      </section>

      <section>
        <h2>Info</h2>
        <p>Due schede: "Informazioni" (testi del club da leggere, es. legge del mare o regole di sicurezza, con PDF scaricabile se disponibile) e "Documenti" (PDF pronti da scaricare o compilare, es. un modulo vergine).</p>
      </section>

      <section>
        <h2>Il menu</h2>
        <p>In basso a destra trovi un pulsante rotondo, sempre raggiungibile con il pollice: toccalo per aprire il menu con tutte le sezioni. Le più usate (Attività, Prenotazioni, Logbook) sono in alto; in fondo trovi Esci, che chiede una conferma prima di uscire.</p>
      </section>

      <section>
        <h2>Segnalare un'anomalia</h2>
        <p>Se qualcosa non funziona, scrivi a apneatreviso@gmail.com con oggetto "anomalia app client", indicando cosa stavi facendo, dispositivo e browser e, se puoi, uno screenshot.</p>
      </section>

      <section>
        <h2>Suggerimenti pratici</h2>
        <ul>
          <li>Se cambi app o il telefono blocca lo schermo prima di salvare un modulo, le modifiche restano in bozza e le ritrovi al ritorno.</li>
          <li>Tutto quello che scrivi viene salvato automaticamente in MAIUSCOLO, per uniformità.</li>
        </ul>
      </section>
    </div>
  )
}
