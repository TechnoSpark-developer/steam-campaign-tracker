import { useEffect, useState } from 'react'
import {
  addGame,
  deleteGame,
  importSteamGames,
  listGames,
  updateGame,
} from '../lib/gamesApi.js'
import {
  countByStatus,
  DEFAULT_FILTERS,
  filterGames,
  getProgress,
  sortGames,
  withoutHidden,
} from '../lib/libraryView.js'
import { fetchSteamLibrary } from '../lib/steamApi.js'
import AddGameForm from './AddGameForm.jsx'
import GameRow from './GameRow.jsx'
import LibraryFilters from './LibraryFilters.jsx'
import LibraryStats from './LibraryStats.jsx'
import SteamImport from './SteamImport.jsx'

// Long lists are shown a page at a time so typing in the search box stays
// fast even with thousands of games.
const PAGE_SIZE = 100

// The signed-in user's game library. It holds two kinds of state:
//   - `games`:   every game the user owns, as loaded from the database
//   - `filters`: how the user wants to look at them (search, status, sort)
// What appears on screen is worked out from those two on every render.
export default function Library({ userId }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [limit, setLimit] = useState(PAGE_SIZE)

  // READ: load the library when the component first appears.
  useEffect(() => {
    let cancelled = false

    listGames()
      .then((loaded) => {
        if (!cancelled) setGames(loaded)
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
      setGames((current) => [...current, created])
    })

  // UPDATE (status, title, notes or the hidden flag)
  const handleUpdate = (id, changes) =>
    run(async () => {
      const updated = await updateGame(id, changes)
      setGames((current) =>
        current.map((game) => (game.id === id ? updated : game)),
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
    setGames(await listGames())

    const importedAppIds = new Set(steamLibrary.games.map((game) => game.appid))
    const added = [...importedAppIds].filter((appid) => !alreadyOwned.has(appid))

    return {
      steamId: steamLibrary.steamId,
      total: importedAppIds.size,
      added: added.length,
    }
  }

  // Changing any filter starts again from the first page of results.
  function handleFilterChange(changes) {
    setFilters((current) => ({ ...current, ...changes }))
    setLimit(PAGE_SIZE)
  }

  // Everything below is derived from `games` and `filters`.
  const progress = getProgress(games)
  const counts = countByStatus(withoutHidden(games, filters.showHidden))
  const matching = sortGames(filterGames(games, filters), filters.sortBy)
  const shown = matching.slice(0, limit)
  const remaining = matching.length - shown.length

  function renderList() {
    if (loading) return <p className="muted">Loading your games…</p>

    if (games.length === 0) {
      return (
        <p className="muted">
          No games yet. Import your Steam library or add a game by hand.
        </p>
      )
    }

    if (matching.length === 0) {
      return (
        <div className="empty-match">
          <p className="muted">No games match these filters.</p>
          <button
            type="button"
            className="btn"
            onClick={() => handleFilterChange(DEFAULT_FILTERS)}
          >
            Clear filters
          </button>
        </div>
      )
    }

    return (
      <>
        <p className="muted list-summary" role="status">
          Showing {shown.length} of {matching.length}{' '}
          {matching.length === 1 ? 'game' : 'games'}
        </p>

        <ul className="game-list">
          {shown.map((game) => (
            <GameRow
              key={game.id}
              game={game}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </ul>

        {remaining > 0 && (
          <button
            type="button"
            className="btn show-more"
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
          >
            Show {Math.min(PAGE_SIZE, remaining)} more ({remaining} not shown)
          </button>
        )}
      </>
    )
  }

  return (
    <section className="card">
      <h2>Your library</h2>

      {!loading && games.length > 0 && <LibraryStats progress={progress} />}

      <div className="library-tools">
        <SteamImport userId={userId} onImport={handleImport} />
        <AddGameForm onAdd={handleAdd} />
      </div>

      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}

      {!loading && games.length > 0 && (
        <LibraryFilters
          filters={filters}
          counts={counts}
          hiddenCount={progress.hidden}
          onChange={handleFilterChange}
        />
      )}

      {renderList()}
    </section>
  )
}
