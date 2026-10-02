import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Registrati from './pages/Registrati'
import PasswordDimenticata from './pages/PasswordDimenticata'
import NuovaPassword from './pages/NuovaPassword'
import CompletaProfilo from './pages/CompletaProfilo'
import AppShell from './components/AppShell'
import Attivita from './pages/Attivita'
import Prenotazioni from './pages/Prenotazioni'
import Profilo from './pages/Profilo'
import Brevetti from './pages/Brevetti'
import Logbook from './pages/Logbook'
import Categorie from './pages/Categorie'
import Aiuto from './pages/Aiuto'
import Info from './pages/Info'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [cliente, setCliente] = useState(undefined)
  const [recupero, setRecupero] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecupero(true)
      setSession(s)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) caricaCliente()
    else setCliente(undefined)
  }, [session])

  async function caricaCliente() {
    setCliente(undefined)
    const { data } = await supabase
      .from('clienti')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
    setCliente(data)
  }

  if (session === undefined) return null

  if (recupero) {
    return <NuovaPassword onCompletato={() => setRecupero(false)} />
  }

  if (!session) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registrati" element={<Registrati />} />
          <Route path="/password-dimenticata" element={<PasswordDimenticata />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  if (cliente === undefined) return null

  if (!cliente) {
    return <CompletaProfilo onCompletato={caricaCliente} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell cliente={cliente} />}>
          <Route path="/" element={<Navigate to="/profilo" replace />} />
          <Route path="/profilo" element={<Profilo cliente={cliente} />} />
          <Route path="/attivita" element={<Attivita cliente={cliente} />} />
          <Route path="/prenotazioni" element={<Prenotazioni cliente={cliente} />} />
          <Route path="/brevetti" element={<Brevetti cliente={cliente} />} />
          <Route path="/logbook" element={<Logbook cliente={cliente} />} />
          <Route path="/categorie" element={<Categorie cliente={cliente} />} />
          <Route path="/info" element={<Info />} />
          <Route path="/aiuto" element={<Aiuto />} />
          <Route path="*" element={<Navigate to="/profilo" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
