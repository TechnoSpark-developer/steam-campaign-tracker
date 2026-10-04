import { useEffect, useState } from 'react'
import {
  addGame,
  deleteGame,
  importSteamGames,
  listGames,
  updateGame,
} from '../lib/gamesApi.js'
import { fetchSteamLibrary } from '../lib/steamApi.js'
import AddGameForm from './AddGameForm.jsx'
import GameRow from './GameRow.jsx'
import SteamImport from './SteamImport.jsx'

// Keeps the list in the same order the database returns it: by title.
function sortByTitle(games) {
  return [...games].sort(
    (a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
      a.id.localeCompare(b.id),
  )
}

// The signed-in user's game library: loads the games once, then keeps the
// on-screen list in step with every import, add, edit and delete.
export default function Library({ userId }) {
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

  // IMPORT: fetch the Steam library, save it, then reload the list.
  // Errors are thrown so SteamImport can show them next to its own form.
  async function handleImport(steamInput) {
    const alreadyOwned = new Set(
      games.map((game) => game.steam_appid).filter((appid) => appid !== null),
    )

    const steamLibrary = await fetchSteamLibrary(steamInput)
    await importSteamGames(steamLibrary.games)
    setGames(sortByTitle(await listGames()))

    const importedAppIds = new Set(steamLibrary.games.map((game) => game.appid))
    const added = [...importedAppIds].filter((appid) => !alreadyOwned.has(appid))

    return {
      steamId: steamLibrary.steamId,
      total: importedAppIds.size,
      added: added.length,
    }
  }

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

      <div className="library-tools">
        <SteamImport userId={userId} onImport={handleImport} />
        <AddGameForm onAdd={handleAdd} />
      </div>

      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="muted">Loading your games…</p>
      ) : games.length === 0 ? (
        <p className="muted">
          No games yet. Import your Steam library or add a game by hand.
        </p>
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
