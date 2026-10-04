import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

// Supabase's default minimum. Checked in the browser so the user gets an
// instant message instead of a round trip to the server.
const MIN_PASSWORD_LENGTH = 6

// Turns Supabase's error codes into wording a user can act on.
function describeError(error) {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Wrong email or password.'
    case 'email_not_confirmed':
      return 'Confirm your email first: open the link that was sent to you, then sign in.'
    case 'user_already_exists':
      return 'An account with this email already exists. Try signing in instead.'
    default:
      return error.message || 'Something went wrong. Try again.'
  }
}

// One form that handles both signing in and registering.
// On success there is nothing to do here: useSession notices the new session
// and App swaps this form for the library.
export default function AuthForm() {
  const [mode, setMode] = useState('sign_in') // 'sign_in' or 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isRegister = mode === 'register'

  function switchMode(newMode) {
    setMode(newMode)
    setError('')
    setNotice('')
  }

  async function register(credentials) {
    const { data, error: signUpError } = await supabase.auth.signUp({
      ...credentials,
      // Where the confirmation link (if the project uses one) sends the user.
      options: { emailRedirectTo: window.location.origin },
    })

    if (signUpError) {
      setError(describeError(signUpError))
    } else if (data.user?.identities?.length === 0) {
      // With email confirmation on, Supabase hides duplicate sign-ups behind
      // a user object that has no identities.
      setError(describeError({ code: 'user_already_exists' }))
    } else if (!data.session) {
      setNotice('Account created. Check your inbox for a confirmation link, then sign in.')
      setMode('sign_in')
      setPassword('')
    }
  }

  async function signIn(credentials) {
    const { error: signInError } =
      await supabase.auth.signInWithPassword(credentials)

    if (signInError) setError(describeError(signInError))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)

    const credentials = { email: email.trim(), password }

    try {
      if (isRegister) {
        await register(credentials)
      } else {
        await signIn(credentials)
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="card auth-card">
      <div className="tabs" role="group" aria-label="Choose sign in or register">
        <button
          type="button"
          className="tab"
          aria-pressed={!isRegister}
          onClick={() => switchMode('sign_in')}
        >
          Sign in
        </button>
        <button
          type="button"
          className="tab"
          aria-pressed={isRegister}
          onClick={() => switchMode('register')}
        >
          Register
        </button>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={isRegister ? MIN_PASSWORD_LENGTH : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {isRegister && (
            <small className="muted">
              At least {MIN_PASSWORD_LENGTH} characters.
            </small>
          )}
        </label>

        {error && (
          <p className="form-message form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="form-message form-notice" role="status">
            {notice}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting
            ? 'Please wait…'
            : isRegister
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>
    </section>
  )
}
