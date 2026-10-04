import { useState } from 'react'

// The last Steam ID a user imported is remembered in this browser so the box
// is already filled in next time. It is a convenience only, so any storage
// problem (private window, blocked storage) is ignored.
function recallSteamId(userId) {
  try {
    return localStorage.getItem(`steam-id:${userId}`) ?? ''
  } catch {
    return ''
  }
}

function rememberSteamId(userId, steamId) {
  try {
    localStorage.setItem(`steam-id:${userId}`, steamId)
  } catch {
    // Not being able to remember it is fine.
  }
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// Form that pulls a Steam library into the app.
// `onImport(steamInput)` does the work and resolves to
// { steamId, total, added }, or throws an Error with a readable message.
export default function SteamImport({ userId, onImport }) {
  const [steamInput, setSteamInput] = useState(() => recallSteamId(userId))
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!steamInput.trim()) return

    setError('')
    setNotice('')
    setImporting(true)

    try {
      const result = await onImport(steamInput.trim())
      rememberSteamId(userId, result.steamId)

      if (result.total === 0) {
        setNotice('That Steam account does not own any games yet.')
      } else {
        const updated = result.total - result.added
        setNotice(
          `Imported ${plural(result.total, 'game')} from Steam: ${result.added} new` +
            (updated > 0 ? `, ${updated} already in your library (playtime refreshed).` : '.'),
        )
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <form className="steam-import" onSubmit={handleSubmit}>
      <div className="tool-row">
        <label className="field tool-field">
          <span>Import from Steam</span>
          <input
            type="text"
            name="steamId"
            placeholder="Steam ID, profile link or custom name"
            autoComplete="off"
            required
            maxLength={200}
            value={steamInput}
            onChange={(event) => setSteamInput(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={importing}>
          {importing ? 'Importing…' : 'Import library'}
        </button>
      </div>

      <small className="muted">
        Your Steam profile&apos;s &quot;Game details&quot; must be set to Public.
        Importing again keeps your statuses and notes.
      </small>

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
    </form>
  )
}
