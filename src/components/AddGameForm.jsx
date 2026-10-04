import { useState } from 'react'

// One-line form for adding a game by hand.
// `onAdd(title)` saves it and resolves to true when the save worked.
export default function AddGameForm({ onAdd }) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    const saved = await onAdd(title)
    setSaving(false)

    // Keep the text if the save failed so the user does not have to retype it.
    if (saved) setTitle('')
  }

  return (
    <form className="add-game tool-row" onSubmit={handleSubmit}>
      <label className="field tool-field">
        <span>Add a game by hand</span>
        <input
          type="text"
          name="title"
          placeholder="Game title"
          autoComplete="off"
          required
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Adding…' : 'Add game'}
      </button>
    </form>
  )
}
