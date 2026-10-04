import { useState } from 'react'
import { DEFAULT_STATUS, STATUSES } from '../lib/statuses.js'

// 312 minutes -> "5.2 h played". Steam reports playtime in minutes.
function formatPlaytime(minutes) {
  if (minutes < 60) return `${minutes} min played`
  return `${Math.round(minutes / 6) / 10} h played`
}

// One game in the list. It has three modes:
//   view           - checkbox, title, status menu, Edit, Hide and Delete buttons
//   edit           - a small form for the title and notes
//   confirm_delete - asks before deleting, so one stray click is harmless
//
// `onUpdate(id, changes)` and `onDelete(id)` save to the database and resolve
// to true when the save worked.
export default function GameRow({ game, onUpdate, onDelete }) {
  const [mode, setMode] = useState('view')
  const [title, setTitle] = useState(game.title)
  const [notes, setNotes] = useState(game.notes)
  const [busy, setBusy] = useState(false)

  const isCompleted = game.status === 'completed'
  const hasCampaign = game.status !== 'no_campaign'

  async function save(changes) {
    setBusy(true)
    const saved = await onUpdate(game.id, changes)
    setBusy(false)
    return saved
  }

  function startEditing() {
    setTitle(game.title)
    setNotes(game.notes)
    setMode('edit')
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    if (!title.trim()) return

    const saved = await save({ title: title.trim(), notes: notes.trim() })
    if (saved) setMode('view')
  }

  async function handleDelete() {
    setBusy(true)
    const deleted = await onDelete(game.id)
    // On success this row disappears, so there is nothing left to update.
    if (!deleted) {
      setBusy(false)
      setMode('view')
    }
  }

  if (mode === 'edit') {
    return (
      <li className="game">
        <form className="form game-edit" onSubmit={handleEditSubmit}>
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              name="title"
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea
              name="notes"
              rows={2}
              maxLength={2000}
              placeholder="Optional, e.g. where you left off"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <div className="game-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => setMode('view')}
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li
      className={`game ${isCompleted ? 'game-completed' : ''} ${game.hidden ? 'game-hidden' : ''}`}
    >
      <input
        type="checkbox"
        className="game-check"
        aria-label={`Mark ${game.title} as completed`}
        checked={isCompleted}
        disabled={busy || !hasCampaign}
        onChange={(event) =>
          save({ status: event.target.checked ? 'completed' : DEFAULT_STATUS })
        }
      />

      <div className="game-info">
        <span className="game-title">
          {game.title}
          {game.hidden && <span className="tag">Hidden</span>}
        </span>
        {game.steam_appid !== null && (
          <span className="game-meta muted">
            {game.playtime_minutes > 0
              ? formatPlaytime(game.playtime_minutes)
              : 'Never played'}
          </span>
        )}
        {game.notes && <span className="game-notes muted">{game.notes}</span>}
      </div>

      <select
        className={`status-select badge-${game.status}`}
        aria-label={`Status of ${game.title}`}
        value={game.status}
        disabled={busy}
        onChange={(event) => save({ status: event.target.value })}
      >
        {STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      {mode === 'confirm_delete' ? (
        <div className="game-actions" role="group" aria-label={`Delete ${game.title}?`}>
          <span className="muted">Delete?</span>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={handleDelete}
          >
            {busy ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => setMode('view')}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="game-actions">
          <button
            type="button"
            className="btn"
            aria-label={`Edit ${game.title}`}
            onClick={startEditing}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn"
            aria-label={`${game.hidden ? 'Unhide' : 'Hide'} ${game.title}`}
            disabled={busy}
            onClick={() => save({ hidden: !game.hidden })}
          >
            {game.hidden ? 'Unhide' : 'Hide'}
          </button>
          <button
            type="button"
            className="btn"
            aria-label={`Delete ${game.title}`}
            onClick={() => setMode('confirm_delete')}
          >
            Delete
          </button>
        </div>
      )}
    </li>
  )
}
