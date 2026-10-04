import { useEffect, useState } from 'react'
import { addGame, deleteGame, listGames, updateGame } from '../lib/gamesApi.js'
import AddGameForm from './AddGameForm.jsx'
import GameRow from './GameRow.jsx'

// Keeps the list in the same order the database returns it: by title.
function sortByTitle(games) {
  return [...games].sort(
    (a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
      a.id.localeCompare(b.id),
  )
}

// The signed-in user's game library: loads the games once, then keeps the
// on-screen list in step with every add, edit and delete.
export default function Library() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // READ: load the library when the component first appears.
  useEffect(() => {
    let cancelled = false

    listGames()
      .then((loaded) => {
        if (!cancelled) setGames(sortByTitle(loaded))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Runs one database action. Returns true on success; on failure it shows
  // the error and returns false so the caller can keep its form open.
  async function run(action) {
    setError('')
    try {
      await action()
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  // CREATE
  const handleAdd = (title) =>
    run(async () => {
      const created = await addGame({ title })
      setGames((current) => sortByTitle([...current, created]))
    })

  // UPDATE
  const handleUpdate = (id, changes) =>
    run(async () => {
      const updated = await updateGame(id, changes)
      setGames((current) =>
        sortByTitle(current.map((game) => (game.id === id ? updated : game))),
      )
    })

  // DELETE
  const handleDelete = (id) =>
    run(async () => {
      await deleteGame(id)
      setGames((current) => current.filter((game) => game.id !== id))
    })

  const completed = games.filter((game) => game.status === 'completed').length

  return (
    <section className="card">
      <div className="library-header">
        <h2>Your library</h2>
        {!loading && games.length > 0 && (
          <p className="muted">
            {games.length} {games.length === 1 ? 'game' : 'games'} ·{' '}
            {completed} completed
          </p>
        )}
      </div>

      <AddGameForm onAdd={handleAdd} />

      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="muted">Loading your games…</p>
      ) : games.length === 0 ? (
        <p className="muted">No games yet. Add your first one above.</p>
      ) : (
        <ul className="game-list">
          {games.map((game) => (
            <GameRow
              key={game.id}
              game={game}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
