// Se il brevetto viene caricato come PDF (es. scansione), lo convertiamo
// subito in PNG prima di salvarlo: così in app è sempre mostrabile come
// immagine (anteprima nella scheda, incollabile nel PDF del registro
// immersioni) invece di restare un PDF che si può solo aprire a parte.
// Convertiamo solo la prima pagina: il brevetto è quasi sempre una pagina
// singola, e nel caso ne avesse altre bastano i dati principali.

import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export async function ePdf(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export async function convertiPrimaPaginaPdfInPng(file) {
  const bufferOriginale = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: bufferOriginale }).promise
  const pagina = await pdf.getPage(1)
  const viewport = pagina.getViewport({ scale: 2.5 })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const contesto = canvas.getContext('2d')

  await pagina.render({ canvasContext: contesto, viewport }).promise

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  const nomeBase = file.name.replace(/\.pdf$/i, '')
  return new File([blob], `${nomeBase}.png`, { type: 'image/png' })
}
