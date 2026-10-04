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

// How many imported games are saved per request.
const IMPORT_BATCH_SIZE = 500

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

// CREATE or UPDATE in bulk: save a list of games that came from Steam.
// `steamGames` is [{ appid, name, playtime_minutes }].
//
// "Upsert" means insert, or update if the row already exists. A row counts as
// existing when this user already has that Steam game (the unique constraint
// on user_id + steam_appid). Only the columns sent here are overwritten, so a
// game's status, notes and hidden flag survive a re-import.
export async function importSteamGames(steamGames) {
  // One row per Steam game, even if Steam listed something twice.
  const rowsByAppId = new Map()
  for (const game of steamGames) {
    rowsByAppId.set(game.appid, {
      steam_appid: game.appid,
      title: game.name,
      playtime_minutes: game.playtime_minutes,
    })
  }
  const rows = [...rowsByAppId.values()]

  // Large libraries are sent in batches to keep each request small.
  for (let start = 0; start < rows.length; start += IMPORT_BATCH_SIZE) {
    const { error } = await supabase
      .from('games')
      .upsert(rows.slice(start, start + IMPORT_BATCH_SIZE), {
        onConflict: 'user_id,steam_appid',
      })

    if (error) fail('save the imported games', error)
  }
}

// DELETE: remove one game from the library.
export async function deleteGame(id) {
  const { error } = await supabase.from('games').delete().eq('id', id)

  if (error) fail('delete the game', error)
}
