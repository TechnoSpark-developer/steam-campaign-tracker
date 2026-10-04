import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'

// Shown once a user is signed in. Counts the rows of the games table that the
// database lets this user see and turns the answer into a readable status.
// It proves that a signed-in user can read their own data; the real library
// screen replaces it in the next milestone.
async function checkConnection() {
  if (!isSupabaseConfigured) {
    return {
      level: 'error',
      title: 'Not configured',
      detail:
        'Copy .env.example to .env, fill in your Supabase URL and publishable key, then restart the dev server.',
    }
  }

  const { count, error } = await supabase
    .from('games')
    .select('id', { count: 'exact' })
    .limit(1)

  if (!error) {
    const total = count ?? 0
    return {
      level: 'ok',
      title: 'Signed in and connected',
      detail: `The database returned ${total} ${total === 1 ? 'game' : 'games'} for your account. Adding games comes next.`,
    }
  }

  // 42501 = Postgres "insufficient privilege": the table exists but signed-in
  // users were never granted access to it.
  if (error.code === '42501') {
    return {
      level: 'error',
      title: 'Signed in, but access to the games table was denied',
      detail:
        'Run section 4 (Data API access) of supabase/migrations/001_create_games.sql in the Supabase SQL Editor.',
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
      <h2>Your library</h2>
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
