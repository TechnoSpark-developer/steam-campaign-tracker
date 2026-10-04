import { supabase } from './supabaseClient.js'

// Asks the steam-library Edge Function (supabase/functions/steam-library) for
// the games a Steam account owns. The function holds the Steam API key, so the
// key never reaches the browser. supabase-js attaches the signed-in user's
// token automatically, which is how the function knows who is asking.
//
// `steamInput` is whatever the user typed: a 17-digit Steam ID, a profile link
// or a custom profile name.
//
// Resolves to { steamId, gameCount, games: [{ appid, name, playtime_minutes }] }
// or throws an Error with a message that is safe to show to the user.
export async function fetchSteamLibrary(steamInput) {
  const { data, error } = await supabase.functions.invoke('steam-library', {
    body: { steamId: steamInput },
  })

  if (error) throw new Error(await describeError(error))

  if (!Array.isArray(data?.games)) {
    throw new Error('The Steam import sent back an unexpected answer. Try again.')
  }

  return data
}

// When the function answers with an error status, supabase-js puts the raw
// response in error.context. Its JSON body carries the reason, for example
// "Set Game details to Public".
async function describeError(error) {
  const fallback = 'The Steam import could not be reached. Check your connection and try again.'

  if (typeof error.context?.json !== 'function') return fallback

  try {
    const body = await error.context.json()
    return body.error || body.message || fallback
  } catch {
    return fallback
  }
}
