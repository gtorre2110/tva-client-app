# Client App — Prenotazioni

## Avvio

1. `npm install`
2. `cp .env.example .env` e inserisci URL e anon key del tuo progetto Supabase (Project Settings → API)
3. `npm run dev`

## Flusso di registrazione

1. Il cliente crea un account con email+password (`/registrati`)
2. Se il progetto Supabase richiede conferma email, deve confermarla prima di poter accedere
3. Al primo accesso, se non ha ancora un profilo cliente collegato, gli viene chiesto un **codice invito** + nome/cognome/telefono per completare la registrazione (funzione `registra_cliente` sul database)

Per creare/gestire i codici invito, usa il SQL Editor di Supabase o aggiungi in futuro una sezione dedicata nell'interfaccia staff:

```sql
insert into codici_invito (codice, utilizzi_massimi) values ('NOMECODICE', 20);
```

## Distribuzione ai beta tester

Questa è un'app web: per farla usare a qualcuno serve un link online (non basta il tuo computer in locale). Per una beta con distribuzione controllata, il flusso tipico è:

1. Pubblica il progetto su un servizio come Vercel o Netlify (piano gratuito): ottieni un URL tipo `https://tuo-progetto.vercel.app`
2. Non serve renderlo "trovabile": non è indicizzato pubblicamente, e lo condividi tu stesso via WhatsApp/email solo con chi vuoi
3. Il codice invito resta comunque un secondo livello di controllo: anche chi trova il link non può registrarsi come cliente senza codice valido

Se vuoi, possiamo occuparcene insieme quando l'app è pronta per il test.

## Struttura

```
src/
  supabaseClient.js
  App.jsx                    # sessione, profilo cliente, routing
  components/AppShell.jsx    # navigazione in basso (mobile)
  pages/
    Login.jsx / Registrati.jsx / CompletaProfilo.jsx
    Attivita.jsx              # elenco attività e prenotazione
    Prenotazioni.jsx          # le proprie prenotazioni, annulla
    Profilo.jsx               # saldo ingressi, certificato, logout
```
