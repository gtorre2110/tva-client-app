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

// Data di scadenza ingressi: valorizzata solo sulla categoria "Allenamenti"
// (colonna categorie.data_scadenza), mostrata solo se il cliente ha quella
// categoria confermata.
export async function scadenzaIngressiAllenamenti(supabase, clienteId) {
  const { data, error } = await supabase
    .from('clienti_categorie')
    .select('confermata, categorie(nome, data_scadenza)')
    .eq('cliente_id', clienteId)
    .eq('confermata', true)

  if (error || !data) return null
  const riga = data.find(
    (r) => r.categorie?.nome?.toUpperCase().startsWith('ALLENAMENTI') && r.categorie?.data_scadenza
  )
  return riga ? riga.categorie.data_scadenza : null
}
