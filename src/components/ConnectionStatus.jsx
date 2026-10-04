import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'

// Asks Supabase for one row of the games table and turns the answer into a
// status the user can read. Nobody is signed in yet, so the *expected* answer
// is "permission denied": it proves the table exists and is locked down.
async function checkConnection() {
  if (!isSupabaseConfigured) {
    return {
      level: 'error',
      title: 'Not configured',
      detail:
        'Copy .env.example to .env, fill in your Supabase URL and publishable key, then restart the dev server.',
    }
  }

  const { error } = await supabase.from('games').select('id').limit(1)

  if (!error) {
    return {
      level: 'ok',
      title: 'Connected',
      detail: 'The games table is reachable.',
    }
  }

  // 42501 = Postgres "insufficient privilege".
  if (error.code === '42501') {
    return {
      level: 'ok',
      title: 'Connected',
      detail:
        'The games table exists and is locked to signed-in users, which is what we want before login is added.',
    }
  }

  // PGRST205 / 42P01 = the table does not exist (yet).
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return {
      level: 'warn',
      title: 'Connected, but the games table is missing',
      detail:
        'Run supabase/migrations/001_create_games.sql in the Supabase SQL Editor.',
    }
  }

  return {
    level: 'error',
    title: 'Could not query Supabase',
    detail: `${error.message || 'No response from the server.'} Check the values in .env.`,
  }
}

export default function ConnectionStatus() {
  const [status, setStatus] = useState({
    level: 'pending',
    title: 'Checking…',
    detail: 'Contacting Supabase.',
  })

  useEffect(() => {
    let cancelled = false

    checkConnection().then((result) => {
      if (!cancelled) setStatus(result)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="card">
      <h2>Database connection</h2>
      <p className={`status status-${status.level}`} role="status">
        <span className="status-dot" aria-hidden="true" />
        <span>
          <strong className="status-title">{status.title}</strong>
          <span className="muted">{status.detail}</span>
        </span>
      </p>
    </section>
  )
}
