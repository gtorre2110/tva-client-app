export function formattaData(data) {
  if (!data) return '—'
  return new Date(data).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

export function formattaDataConAnno(data) {
  if (!data) return '—'
  return new Date(data).toLocaleDateString('it-IT')
}

export function formattaOra(ora) {
  if (!ora) return '—'
  return ora.slice(0, 5)
}

export function certificatoScaduto(scadenza) {
  if (!scadenza) return false
  return scadenza < new Date().toISOString().slice(0, 10)
}

export function certificatoInScadenza(scadenza, giorni = 15) {
  if (!scadenza || certificatoScaduto(scadenza)) return false
  const soglia = new Date()
  soglia.setDate(soglia.getDate() + giorni)
  return scadenza <= soglia.toISOString().slice(0, 10)
}
