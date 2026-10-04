// Pure helpers that turn the full list of games into what the screen shows.
// They never touch the database or React, which keeps them easy to test:
// the same input always gives the same output.

export const SORT_OPTIONS = [
  { value: 'title', label: 'Title (A to Z)' },
  { value: 'playtime', label: 'Most played' },
]

export const DEFAULT_FILTERS = {
  search: '',
  status: 'all', // 'all' or one of the status values
  showHidden: false,
  sortBy: 'title',
}

function compareTitles(a, b) {
  return (
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
    a.id.localeCompare(b.id)
  )
}

// Returns a new, sorted array. The original is left untouched.
export function sortGames(games, sortBy = 'title') {
  const sorted = [...games]

  if (sortBy === 'playtime') {
    // Most played first; ties fall back to the title.
    return sorted.sort(
      (a, b) => b.playtime_minutes - a.playtime_minutes || compareTitles(a, b),
    )
  }

  return sorted.sort(compareTitles)
}

// Hidden games are left out unless the user asks to see them.
export function withoutHidden(games, showHidden) {
  return showHidden ? games : games.filter((game) => !game.hidden)
}

// Applies every filter: hidden, status and the search text.
export function filterGames(games, { search, status, showHidden }) {
  const needle = search.trim().toLowerCase()

  return withoutHidden(games, showHidden).filter(
    (game) =>
      (status === 'all' || game.status === status) &&
      (needle === '' || game.title.toLowerCase().includes(needle)),
  )
}

// How many games have each status, plus the total under "all".
// Used for the numbers on the filter buttons.
export function countByStatus(games) {
  const counts = {
    all: games.length,
    not_started: 0,
    playing: 0,
    completed: 0,
    no_campaign: 0,
  }

  for (const game of games) {
    counts[game.status] += 1
  }

  return counts
}

// Campaign progress across the library.
// Games marked "No campaign" have nothing to finish and hidden games were
// set aside on purpose, so neither counts for or against the percentage.
export function getProgress(games) {
  const counted = games.filter(
    (game) => !game.hidden && game.status !== 'no_campaign',
  )
  const completed = counted.filter((game) => game.status === 'completed').length

  return {
    completed,
    total: counted.length,
    percent:
      counted.length === 0 ? 0 : Math.round((completed / counted.length) * 100),
    hidden: games.filter((game) => game.hidden).length,
  }
}
