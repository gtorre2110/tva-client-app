// Genera un PDF vero e proprio (una pagina per uscita), replicando la scheda
// cartacea originale "Registrazione immersioni: Apnea in mare". A differenza
// della vecchia versione, non passa più dalla finestra di stampa del
// browser (il risultato dipendeva da come ogni browser/stampante
// interpretava il formato pagina, causando problemi di impaginazione): qui
// il contenuto viene disegnato fuori schermo, catturato come immagine ad
// alta risoluzione e incollato direttamente in un PDF con jsPDF, quindi il
// risultato è identico per tutti. Il cliente scarica il file e poi decide
// se stamparlo, inviarlo via email, ecc.

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const CIELO = { sereno: 'Sereno', velato: 'Velato', coperto: 'Coperto', pioggia: 'Pioggia' }
const SUPERFICIE = { calma: 'Calma', quasi_calma: 'QuasiCalma', mossa: 'Mossa', molto_mossa: 'MoltoMossa' }
const VISIBILITA = { buona: 'Buona', sufficiente: 'Sufficiente', scarsa: 'Scarsa' }
const ASSETTO = { costante: 'Assetto Costante', variabile: 'Assetto Variabile', no_limits: 'No limits' }

// mm <-> px CSS: 1mm = 96/25.4 px (riferimento standard dei browser, 96dpi)
const PX_PER_MM = 96 / 25.4

function scelte(mappa, valoreSelezionato) {
  return Object.entries(mappa)
    .map(([chiave, etichetta]) => `<span class="scelta">${chiave === valoreSelezionato ? '☑' : '☐'} ${etichetta}</span>`)
    .join(' ')
}

function numeroOTrattino(v, unita = '') {
  return v || v === 0 ? `${v}${unita}` : '___'
}

function flag(etichetta, valore) {
  return `<span class="scelta">${valore ? '☑' : '☐'} ${etichetta}</span>`
}

function scheda(v, cliente, formattaData) {
  const luogo = v.localita_immersione?.nome || v.luogo || ''
  const istruttoreDelClub = v.istruttori?.nome || v.istruttore_nome_libero || ''
  const numeroBrevetto = v.brevetti?.numero_brevetto || ''

  return `
    <section class="scheda">
      <div class="intestazione">
        <img src="/logo-scheda.png" alt="" class="logo" />
        <div class="titoli">
          <h1>Scheda di registrazione immersioni:</h1>
          <h2>Apnea in mare</h2>
        </div>
        <div class="socio">${cliente.nome}<br />${cliente.cognome}</div>
      </div>

      <div class="riga riga-uscita">
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
        <div>Giacca muta mm <strong>${numeroOTrattino(v.muta_giacca_mm)}</strong> Pantaloni muta mm <strong>${numeroOTrattino(v.muta_pantaloni_mm)}</strong> Bermuda mm <strong>${numeroOTrattino(v.muta_bermuda_mm)}</strong></div>
        <div>Guanti mm <strong>${numeroOTrattino(v.guanti_mm)}</strong> Calzari mm <strong>${numeroOTrattino(v.calzari_mm)}</strong> Zavorra kg <strong>${numeroOTrattino(v.zavorra_kg)}</strong> Pinne <strong>${v.pinne || '—'}</strong></div>
        <div>${flag('Computer/Orologio', v.usa_computer_orologio)} ${flag('Coltello/Tagliasagole', v.usa_coltello_tagliasagole)}</div>
      </div>

      <div class="blocco titolo">Note / Sensazioni</div>
      <div class="blocco note">${v.note || ''}</div>

      <div class="blocco piede">
        <div>Compagno/Guida/Istruttore <strong>${v.compagno_immersione || istruttoreDelClub || '—'}</strong></div>
        <div>N. Brevetto <strong>${numeroBrevetto || '—'}</strong> Conferma istruttore <strong>${v.confermato_da_istruttore ? 'Sì' : 'No'}</strong></div>
      </div>
    </section>`
}

// Stesso foglio di stile della vecchia versione stampabile, senza le regole
// legate a @page/page-break (non servono: ogni scheda diventa un'immagine a
// sé, una per pagina PDF).
const STILE = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #12181f; font-size: 7.3pt; line-height: 1.25; }

  .scheda {
    width: 97mm;
    min-height: 140mm;
    border: 1.1pt solid #12181f;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fff;
  }

  .intestazione {
    display: flex;
    align-items: center;
    gap: 2mm;
    padding: 2mm 2.5mm;
    border-bottom: 1.1pt solid #12181f;
    background: #eaf5fb;
  }
  .intestazione .logo { height: 11mm; width: auto; flex-shrink: 0; }
  .intestazione .titoli { flex: 1; text-align: left; }
  .intestazione h1 { margin: 0; font-size: 6.6pt; font-weight: 700; }
  .intestazione h2 { margin: 0; font-size: 9.5pt; font-weight: 700; color: #006699; }
  .intestazione .socio { font-size: 5.6pt; text-align: right; color: #333; line-height: 1.15; white-space: nowrap; }

  .riga, .blocco {
    padding: 1.4mm 2.5mm;
    border-bottom: 0.7pt solid #12181f;
    text-align: left;
  }
  .riga-uscita { display: flex; flex-wrap: wrap; gap: 0 3mm; align-items: baseline; }
  .blocco div, .riga div { margin: 0.4mm 0; }
  .blocco.titolo {
    font-weight: 700;
    text-align: center;
    background: #f4f4f4;
    border-top: 0.7pt solid #12181f;
  }
  .blocco.note { flex: 1; white-space: pre-wrap; }
  .blocco.piede { border-bottom: none; margin-top: auto; }
  .scelta { display: inline-block; margin-right: 2mm; white-space: nowrap; }
  strong { font-weight: 700; }
`

function attendiImmagini(container) {
  const immagini = Array.from(container.querySelectorAll('img'))
  return Promise.all(
    immagini.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve
            img.onerror = resolve
          })
    )
  )
}

// formato: 'A6' (dimensione identica all'originale cartaceo) oppure
// 'A5' (stessa scheda, centrata su un foglio più grande, con margine
// intorno — comodo per chi non ha carta A6).
export async function generaPdfLogbook(cliente, voci, formattaData, formato = 'A6') {
  if (!voci || voci.length === 0) return

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '0'
  container.innerHTML = `<style>${STILE}</style>${voci.map((v) => scheda(v, cliente, formattaData)).join('')}`
  document.body.appendChild(container)

  try {
    await attendiImmagini(container)
    // Un frame in più per far assestare il layout (flex, font) prima di catturare.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    const schedeEl = Array.from(container.querySelectorAll('.scheda'))
    const scala = 3 // risoluzione di cattura (più alto = più nitido, file più pesante)

    const doc = new jsPDF({
      unit: 'mm',
      format: formato === 'A5' ? 'a5' : 'a6',
      orientation: 'portrait',
    })

    for (let i = 0; i < schedeEl.length; i++) {
      const el = schedeEl[i]
      const canvas = await html2canvas(el, { scale: scala, backgroundColor: '#ffffff' })
      const immagine = canvas.toDataURL('image/jpeg', 0.95)

      const larghezzaSchedaMm = el.offsetWidth / PX_PER_MM
      const altezzaSchedaMm = el.offsetHeight / PX_PER_MM

      const pagina = doc.internal.pageSize
      const larghezzaPagina = pagina.getWidth()
      const altezzaPagina = pagina.getHeight()

      const x = (larghezzaPagina - larghezzaSchedaMm) / 2
      const y = (altezzaPagina - altezzaSchedaMm) / 2

      if (i > 0) doc.addPage(formato === 'A5' ? 'a5' : 'a6', 'portrait')
      doc.addImage(immagine, 'JPEG', x, y, larghezzaSchedaMm, altezzaSchedaMm)
    }

    const nomeFile = `logbook_${(cliente.cognome || '').toLowerCase()}_${(cliente.nome || '').toLowerCase()}_${formato}.pdf`
    doc.save(nomeFile.replace(/\s+/g, '_'))
  } finally {
    document.body.removeChild(container)
  }
}
