import { supabase } from './supabaseClient.js'

// Every database call the app makes lives in this file, so the components
// never talk to Supabase directly. Each function either returns data or throws
// an Error with a message that is safe to show to the user.
//
// Row-level security does the filtering: a query for "all games" only ever
// returns the rows that belong to the signed-in user.

// The columns the UI needs (everything except user_id).
const COLUMNS =
  'id, steam_appid, title, playtime_minutes, status, hidden, notes, created_at, updated_at'

// Supabase returns at most 1000 rows per request, so large libraries are
// fetched one page at a time.
const PAGE_SIZE = 1000

function fail(action, error) {
  const offline = /failed to fetch|networkerror/i.test(error.message ?? '')
  const reason = offline
    ? 'the server could not be reached. Check your connection.'
    : error.message
  throw new Error(`Could not ${action}: ${reason}`)
}

// READ: every game in the signed-in user's library, sorted by title.
export async function listGames() {
  const games = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('games')
      .select(COLUMNS)
      .order('title')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)

    if (error) fail('load your games', error)

    games.push(...data)
    if (data.length < PAGE_SIZE) break
  }

  return games
}

// CREATE: add one game by hand. The database fills in the owner (user_id),
// the default status and the timestamps, and returns the finished row.
export async function addGame({ title }) {
  const { data, error } = await supabase
    .from('games')
    .insert({ title: title.trim() })
    .select(COLUMNS)
    .single()

  if (error) fail('add the game', error)
  return data
}

// UPDATE: change some fields of one game, for example { status: 'completed' }.
export async function updateGame(id, changes) {
  const { data, error } = await supabase
    .from('games')
    .update(changes)
    .eq('id', id)
    .select(COLUMNS)
    .single()

  if (error) fail('save the change', error)
  return data
}

// DELETE: remove one game from the library.
export async function deleteGame(id) {
  const { error } = await supabase.from('games').delete().eq('id', id)

  if (error) fail('delete the game', error)
}
