import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

// Keeps track of who is signed in.
// `session` is null when nobody is signed in; `loading` is true only for the
// brief moment while Supabase restores a saved session after a page reload.
export function useSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // No .env yet: there is nothing to restore.
    if (!supabase) {
      setLoading(false)
      return
    }

    // 1. Restore a session saved in the browser by a previous visit.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // 2. Stay up to date when the user signs in, signs out, or the token is
    //    refreshed in the background.
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
