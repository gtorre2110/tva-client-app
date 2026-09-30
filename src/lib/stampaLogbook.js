// Apre una finestra con una "scheda" per ogni voce, in un formato che
// replica la scheda cartacea "Registrazione immersioni: Apnea in mare",
// pronta per essere stampata o salvata come PDF con la funzione di
// stampa del browser (nessuna libreria esterna).

const CIELO = { sereno: 'Sereno', velato: 'Velato', coperto: 'Coperto', pioggia: 'Pioggia' }
const SUPERFICIE = { calma: 'Calma', quasi_calma: 'QuasiCalma', mossa: 'Mossa', molto_mossa: 'MoltoMossa' }
const VISIBILITA = { buona: 'Buona', sufficiente: 'Sufficiente', scarsa: 'Scarsa' }
const ASSETTO = { costante: 'Assetto Costante', variabile: 'Assetto Variabile', no_limits: 'No limits' }

function scelte(mappa, valoreSelezionato) {
  return Object.entries(mappa)
    .map(([chiave, etichetta]) => `<span class="scelta">${chiave === valoreSelezionato ? '☑' : '☐'} ${etichetta}</span>`)
    .join(' ')
}

function numeroOTrattino(v, unita = '') {
  return v || v === 0 ? `${v}${unita}` : '___'
}

function scheda(v, formattaData) {
  const luogo = v.localita_immersione?.nome || v.luogo || ''
  const istruttoreDelClub = v.istruttori?.nome || v.istruttore_nome_libero || ''
  const numeroBrevetto = v.brevetti?.numero_brevetto || ''

  return `
    <section class="scheda">
      <div class="intestazione">
        <img src="/logo-scheda.png" alt="" class="logo" />
        <div>
          <h1>Scheda di registrazione immersioni:</h1>
          <h2>Apnea in mare</h2>
        </div>
      </div>

      <div class="riga-top">
        <span>N°Uscita <strong>${numeroOTrattino(v.numero_uscita)}</strong></span>
        <span>data <strong>${formattaData(v.data)}</strong></span>
        <span>${scelte({ lago: 'Lago', mare: 'Mare' }, v.specchio_acqua)}</span>
      </div>

      <div class="blocco">
        <div>Località <strong>${luogo || '—'}</strong></div>
        <div>Coordinate Lat. <strong>${v.coordinate_lat || '—'}</strong> Long. <strong>${v.coordinate_long || '—'}</strong></div>
      </div>

      <div class="blocco titolo">Condizioni Ambientali</div>
      <div class="blocco">
        <div>CIELO: ${scelte(CIELO, v.condizioni_cielo)}</div>
        <div>SUPERFICIE: ${scelte(SUPERFICIE, v.condizioni_superficie)}</div>
        <div>VISIBILITÀ: ${scelte(VISIBILITA, v.visibilita)}</div>
        <div>TEMPERATURA: Acqua <strong>${numeroOTrattino(v.temperatura_acqua, '°C')}</strong> Aria <strong>${numeroOTrattino(v.temperatura_aria, '°C')}</strong></div>
      </div>

      <div class="blocco titolo">Attività svolta</div>
      <div class="blocco">
        <div>N. Tuffi Svolti <strong>${numeroOTrattino(v.numero_tuffi)}</strong> Max profondità raggiunta <strong>${numeroOTrattino(v.profondita_raggiunta, 'm')}</strong></div>
        <div>Tempo Max d'immersione <strong>${v.tempo_max_immersione || '___'}</strong> Min profondità raggiunta <strong>${numeroOTrattino(v.profondita_min_raggiunta, 'm')}</strong></div>
        <div>${scelte(ASSETTO, v.assetto)}</div>
      </div>

      <div class="blocco titolo">Attrezzatura utilizzata</div>
      <div class="blocco">
        <div>Giacca muta <strong>${numeroOTrattino(v.muta_giacca_mm, 'mm')}</strong> Pantaloni muta <strong>${numeroOTrattino(v.muta_pantaloni_mm, 'mm')}</strong> Bermuda <strong>${numeroOTrattino(v.muta_bermuda_mm, 'mm')}</strong></div>
        <div>Guanti <strong>${numeroOTrattino(v.guanti_mm, 'mm')}</strong> Calzari <strong>${numeroOTrattino(v.calzari_mm, 'mm')}</strong> Zavorra <strong>${numeroOTrattino(v.zavorra_kg, 'kg')}</strong> Pinne <strong>${v.pinne || '—'}</strong></div>
      </div>

      <div class="blocco titolo">Note / Sensazioni</div>
      <div class="blocco note">${v.note || ''}</div>

      <div class="blocco piede">
        <div>Compagno/Guida/Istruttore <strong>${v.compagno_immersione || istruttoreDelClub || '—'}</strong></div>
        <div>N. Brevetto <strong>${numeroBrevetto || '—'}</strong> Conferma istruttore <strong>${v.confermato_da_istruttore ? 'Sì' : 'No'}</strong></div>
      </div>
    </section>`
}

export function stampaLogbook(cliente, voci, formattaData) {
  const schede = voci.map((v) => scheda(v, formattaData)).join('\n')

  const html = `
    <!doctype html>
    <html lang="it">
      <head>
        <meta charset="utf-8" />
        <title>Logbook — ${cliente.nome} ${cliente.cognome}</title>
        <style>
          body { font-family: -apple-system, Arial, sans-serif; color: #12181f; margin: 1.5rem; font-size: 0.85rem; }
          .scheda { max-width: 620px; margin: 0 auto 1.5rem; border: 2px solid #12181f; border-radius: 4px; page-break-inside: avoid; overflow: hidden; }
          .intestazione { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 0.7rem 0.9rem; border-bottom: 2px solid #12181f; background: #eaf5fb; text-align: center; }
          .intestazione .logo { height: 48px; width: auto; }
          .intestazione h1 { margin: 0; font-size: 0.9rem; font-weight: 700; }
          .intestazione h2 { margin: 0; font-size: 1.15rem; font-weight: 700; color: #006699; }
          .riga-top { display: flex; justify-content: center; gap: 1.75rem; padding: 0.5rem 0.9rem; border-bottom: 1px solid #12181f; font-size: 0.9rem; text-align: center; }
          .blocco { padding: 0.45rem 0.9rem; border-bottom: 1px solid #ddd; text-align: center; }
          .blocco.titolo { font-weight: 700; text-align: center; background: #f4f4f4; border-top: 1px solid #12181f; border-bottom: 1px solid #12181f; }
          .blocco div { margin: 0.2rem 0; }
          .blocco.note { min-height: 2.5rem; white-space: pre-wrap; text-align: left; }
          .blocco.piede { border-bottom: none; }
          .scelta { display: inline-block; margin: 0 0.35rem; }
          strong { font-weight: 700; }
          @media print { body { margin: 0.5cm; } .scheda { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1 style="font-size:1.1rem;">Logbook di ${cliente.nome} ${cliente.cognome}</h1>
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
