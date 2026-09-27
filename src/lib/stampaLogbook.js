// Apre una finestra con una "scheda" per ogni voce, pronta per essere stampata
// o salvata come PDF con la funzione di stampa del browser (nessuna libreria esterna).
export function stampaLogbook(cliente, voci, formattaData) {
  const schede = voci
    .map(
      (v) => `
      <section class="scheda">
        <h2>${formattaData(v.data)}</h2>
        <table>
          <tr><td>Orario</td><td>${v.ora_inizio?.slice(0, 5) || '—'} – ${v.ora_fine?.slice(0, 5) || '—'}</td></tr>
          <tr><td>Località</td><td>${v.localita_immersione?.nome || v.luogo || '—'}</td></tr>
          <tr><td>Centro di immersione</td><td>${v.centri_immersione?.nome || v.centro_immersione_libero || '—'}</td></tr>
          <tr><td>Istruttore</td><td>${v.istruttori?.nome || v.istruttore_nome_libero || '—'}</td></tr>
          <tr><td>Autorespiratore</td><td>${v.tipo_autorespiratore || '—'}</td></tr>
          <tr><td>Miscela</td><td>${v.miscela_utilizzata || '—'}</td></tr>
          <tr><td>Profondità programmata</td><td>${v.profondita_programmata ? v.profondita_programmata + ' m' : '—'}</td></tr>
          <tr><td>Profondità raggiunta</td><td>${v.profondita_raggiunta ? v.profondita_raggiunta + ' m' : '—'}</td></tr>
          <tr><td>Corso</td><td>${v.corso || '—'}</td></tr>
          <tr><td>Note</td><td>${v.note || '—'}</td></tr>
          <tr><td>Confermata dall'istruttore</td><td>${v.confermato_da_istruttore ? 'Sì' : 'No'}</td></tr>
        </table>
      </section>`
    )
    .join('\n')

  const html = `
    <!doctype html>
    <html lang="it">
      <head>
        <meta charset="utf-8" />
        <title>Logbook — ${cliente.nome} ${cliente.cognome}</title>
        <style>
          body { font-family: -apple-system, Arial, sans-serif; color: #12181f; margin: 2rem; }
          h1 { color: #006699; }
          .scheda { border: 1px solid #dceaf3; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.25rem; page-break-inside: avoid; }
          .scheda h2 { margin: 0 0 0.75rem; color: #006699; font-size: 1.1rem; }
          table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
          td { padding: 0.35rem 0.5rem; border-bottom: 1px solid #eee; }
          td:first-child { font-weight: 600; width: 40%; color: #444; }
          @media print { body { margin: 0.5cm; } }
        </style>
      </head>
      <body>
        <h1>Logbook di ${cliente.nome} ${cliente.cognome}</h1>
        ${schede || '<p>Nessuna voce registrata.</p>'}
      </body>
    </html>
  `

  const finestra = window.open('', '_blank')
  if (!finestra) return
  finestra.document.write(html)
  finestra.document.close()
  finestra.focus()
  setTimeout(() => finestra.print(), 300)
}
