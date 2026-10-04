import AuthForm from './components/AuthForm.jsx'
import Intro from './components/Intro.jsx'
import Library from './components/Library.jsx'
import SetupNotice from './components/SetupNotice.jsx'
import { useSession } from './hooks/useSession.js'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient.js'

// Root component. Decides what to show based on who is signed in:
//   - nobody  -> intro + sign in / register form
//   - a user  -> their game library
export default function App() {
  const { session, loading } = useSession()
  const user = session?.user

  async function handleLogOut() {
    // useSession hears about the sign-out and the page switches to the form.
    await supabase.auth.signOut()
  }

  function renderMain() {
    if (!isSupabaseConfigured) return <SetupNotice />

    if (loading) return <p className="muted">Loading…</p>

    if (!user) {
      return (
        <div className="landing">
          <Intro />
          <AuthForm />
        </div>
      )
    }

    // key makes the library start fresh if a different user signs in.
    return <Library key={user.id} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Steam Campaign Tracker</h1>

        {user && (
          <div className="app-user">
            <span className="app-user-email muted" title={user.email}>
              {user.email}
            </span>
            <button type="button" className="btn" onClick={handleLogOut}>
              Log out
            </button>
          </div>
        )}
      </header>

      <main className="app-main">{renderMain()}</main>
    </div>
  )
}
