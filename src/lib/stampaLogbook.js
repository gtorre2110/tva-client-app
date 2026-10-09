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

// Campo compilabile: se il dato c'è, lo mostra in grassetto senza righe;
// se manca, lascia una linea "bassa" su cui scrivere a penna dopo la stampa.
// `grow` regola la larghezza relativa del campo nella riga (i campi di una
// riga si dividono lo spazio libero), `unita` è il suffisso (m, °C, ...).
function campo(etichetta, valore, { unita = '', grow = 1 } = {}) {
  const presente = valore || valore === 0
  const corpo = presente
    ? `<strong>${valore}${unita}</strong>`
    : `<span class="linea"></span>${unita ? `<span class="unita">${unita}</span>` : ''}`
  return `<span class="campo" style="flex: ${grow} 1 0">${etichetta ? `<span class="etichetta">${etichetta}</span>` : ''}${corpo}</span>`
}

// Riga di caselle da spuntare: stessa altezza e stessi margini delle righe
// con i campi, con le opzioni distribuite su tutta la larghezza.
function rigaScelte(etichetta, opzioni) {
  const intestazione = etichetta ? `<span class="etichetta">${etichetta}</span>` : ''
  return `<div class="riga-campi riga-scelte">${intestazione}${opzioni}</div>`
}

function riga(...campi) {
  return `<div class="riga-campi">${campi.join('')}</div>`
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
          <h2>Apnea in acque libere</h2>
        </div>
        <div class="socio">${cliente.nome}<br />${cliente.cognome}</div>
      </div>

      <div class="riga riga-uscita">
        ${campo('N°Uscita', v.numero_uscita, { grow: 0.8 })}
        ${campo('data', formattaData(v.data), { grow: 1.3 })}
        <span class="campo" style="flex: 1.6 1 0">${scelte({ lago: 'Lago', mare: 'Mare' }, v.specchio_acqua)}</span>
      </div>

      <div class="blocco">
        ${riga(campo('Località', luogo))}
        ${riga(campo('Coordinate Lat.', v.coordinate_lat), campo('Long.', v.coordinate_long))}
      </div>

      <div class="blocco titolo">Condizioni Ambientali</div>
      <div class="blocco">
        ${rigaScelte('CIELO:', scelte(CIELO, v.condizioni_cielo))}
        ${rigaScelte('SUPERFICIE:', scelte(SUPERFICIE, v.condizioni_superficie))}
        ${rigaScelte('VISIBILITÀ:', scelte(VISIBILITA, v.visibilita))}
        ${riga('<span class="campo" style="flex: 0 0 auto"><span class="etichetta">TEMPERATURA:</span></span>', campo('Acqua', v.temperatura_acqua, { unita: '°C' }), campo('Aria', v.temperatura_aria, { unita: '°C' }))}
      </div>

      <div class="blocco titolo">Attività svolta</div>
      <div class="blocco">
        ${riga(campo('N. Tuffi Svolti', v.numero_tuffi, { grow: 0.8 }), campo('Max profondità raggiunta', v.profondita_raggiunta, { unita: 'm', grow: 1.2 }))}
        ${riga(campo("Tempo Max d'immersione", v.tempo_max_immersione, { grow: 0.9 }), campo('Min profondità raggiunta', v.profondita_min_raggiunta, { unita: 'm', grow: 1.1 }))}
        ${rigaScelte('', scelte(ASSETTO, v.assetto))}
      </div>

      <div class="blocco titolo">Attrezzatura utilizzata</div>
      <div class="blocco">
        ${riga(campo('Giacca muta mm', v.muta_giacca_mm), campo('Pantaloni muta mm', v.muta_pantaloni_mm, { grow: 1.1 }), campo('Bermuda mm', v.muta_bermuda_mm))}
        ${riga(campo('Guanti mm', v.guanti_mm), campo('Calzari mm', v.calzari_mm), campo('Zavorra kg', v.zavorra_kg), campo('Pinne', v.pinne, { grow: 1.5 }))}
        ${rigaScelte('', flag('Computer/Orologio', v.usa_computer_orologio) + flag('Coltello/Tagliasagole', v.usa_coltello_tagliasagole))}
      </div>

      <div class="blocco titolo">Note / Sensazioni</div>
      <div class="blocco note">${v.note || ''}</div>

      <div class="blocco piede">
        ${riga(campo('Compagno/Guida/Istruttore', v.compagno_immersione || istruttoreDelClub))}
        ${riga(campo('N. Brevetto', numeroBrevetto, { grow: 1.3 }), campo('Conferma istruttore', v.confermato_da_istruttore ? 'Sì' : 'No'))}
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
    min-height: 144mm;
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
    padding: 0.9mm 2.5mm;
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
  .blocco.note { flex: 1; min-height: 20mm; white-space: pre-wrap; }
  .blocco.piede { border-bottom: none; margin-top: auto; }
  .scelta { display: inline-block; margin-right: 2mm; white-space: nowrap; }
  strong { font-weight: 700; }
  .blocco .riga-campi { display: flex; align-items: stretch; gap: 3mm; margin: 0.5mm 0; height: 4.6mm; }
  .blocco .riga-scelte { justify-content: space-between; align-items: flex-end; gap: 1.5mm; }
  .riga-scelte .scelta { margin-right: 0; }
  .riga-uscita { align-items: stretch; height: auto; border-bottom: none; padding-bottom: 0; }
  .scheda .campo { margin: 0; padding: 0; }
  .campo { display: flex; align-items: flex-end; height: 4.6mm; min-width: 0; gap: 1.2mm; line-height: 1.1; }
  .campo .etichetta { white-space: nowrap; }
  .campo strong { padding-bottom: 0.2mm; }
  .campo .linea { flex: 1; min-width: 6mm; height: 3.5mm; border-bottom: 0.7pt solid #12181f; }
  .campo .unita { white-space: nowrap; }
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
// 'A5' (stessa scheda, ingrandita per riempire il foglio più grande,
// con un piccolo margine — non lascia bordo bianco inutile).
const MARGINE_A5_MM = 6
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

      let larghezzaSchedaMm = el.offsetWidth / PX_PER_MM
      let altezzaSchedaMm = el.offsetHeight / PX_PER_MM

      const pagina = doc.internal.pageSize
      const larghezzaPagina = pagina.getWidth()
      const altezzaPagina = pagina.getHeight()

      if (formato === 'A5') {
        // Ingrandisce la scheda (mantenendo le proporzioni) per riempire il
        // foglio A5 lasciando solo un piccolo margine, invece di lasciarla
        // alla dimensione nativa con un grande bordo bianco intorno.
        const scalaFoglio = Math.min(
          (larghezzaPagina - 2 * MARGINE_A5_MM) / larghezzaSchedaMm,
          (altezzaPagina - 2 * MARGINE_A5_MM) / altezzaSchedaMm
        )
        larghezzaSchedaMm *= scalaFoglio
        altezzaSchedaMm *= scalaFoglio
      }

      if (formato !== 'A5') {
        // Su A6 la scheda ha dimensione nativa; se per qualche motivo è più
        // grande del foglio (testi lunghi), la riduciamo invece di tagliarla.
        const MARGINE_A6_MM = 3
        const riduzione = Math.min(
          1,
          (larghezzaPagina - 2 * MARGINE_A6_MM) / larghezzaSchedaMm,
          (altezzaPagina - 2 * MARGINE_A6_MM) / altezzaSchedaMm
        )
        larghezzaSchedaMm *= riduzione
        altezzaSchedaMm *= riduzione
      }

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
