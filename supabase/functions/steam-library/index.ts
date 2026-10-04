// Supabase Edge Function: steam-library
//
// The browser cannot call the Steam Web API itself: Steam does not allow
// cross-site requests, and the API key must stay secret. This function runs on
// Supabase's servers instead. A signed-in user sends a Steam ID or profile
// link, and it answers with the list of games that Steam account owns.
//
// It only reads from Steam. Saving the games to the database is done by the
// app, so row-level security applies exactly as it does for hand-added games.
//
// Requires one secret (Edge Functions > Secrets): STEAM_API_KEY

const STEAM_API = 'https://api.steampowered.com'

// Longest title the games table accepts (see 001_create_games.sql).
const MAX_TITLE_LENGTH = 200

// An error that should be shown to the user, with the HTTP status to send.
class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// --- CORS --------------------------------------------------------------------
// The app is served from a different address than this function, so the
// browser asks for permission (an OPTIONS "preflight" request) before sending
// the real one. These headers grant it.
function corsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      req.headers.get('Access-Control-Request-Headers') ??
      'authorization, x-client-info, apikey, content-type',
  }
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

// --- Who is calling? -----------------------------------------------------------
// Asks Supabase Auth whether the token sent with the request belongs to a real
// signed-in user. Without this, anyone could use the function (and the Steam
// key behind it) without an account.
async function isSignedIn(req: Request): Promise<boolean> {
  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) return false

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const apiKey = req.headers.get('apikey') ?? defaultPublishableKey()
  if (!supabaseUrl || !apiKey) return false

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: apiKey },
    })
    if (!response.ok) return false

    const user = await response.json()
    return typeof user?.id === 'string'
  } catch {
    return false
  }
}

// Fallback for callers that did not send an "apikey" header.
function defaultPublishableKey(): string | undefined {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}')
    return keys.default ?? Deno.env.get('SUPABASE_ANON_KEY')
  } catch {
    return Deno.env.get('SUPABASE_ANON_KEY')
  }
}

// --- Understanding what the user typed ----------------------------------------
// Accepts any of:
//   76561198000000000                               (17-digit SteamID64)
//   https://steamcommunity.com/profiles/7656119...  (profile link)
//   https://steamcommunity.com/id/some-name         (custom profile link)
//   some-name                                       (custom name on its own)
type SteamInput = { steamId: string } | { vanity: string }

const VANITY_PATTERN = /^[A-Za-z0-9_-]{2,32}$/

function parseSteamInput(raw: unknown): SteamInput | null {
  if (typeof raw !== 'string' || raw.length > 200) return null
  const text = raw.trim()

  if (/^\d{17}$/.test(text)) return { steamId: text }
  // A long number that is not 17 digits is almost certainly a mistyped ID.
  if (/^\d{10,}$/.test(text)) return null

  const profile = text.match(/steamcommunity\.com\/profiles\/(\d{17})(?:[/?#]|$)/i)
  if (profile) return { steamId: profile[1] }

  const custom = text.match(/steamcommunity\.com\/id\/([^/?#\s]+)/i)
  if (custom) {
    return VANITY_PATTERN.test(custom[1]) ? { vanity: custom[1] } : null
  }

  return VANITY_PATTERN.test(text) ? { vanity: text } : null
}

// --- Talking to Steam ----------------------------------------------------------
// The key is added here and never appears in a response or an error message.
async function steamGet(
  path: string,
  params: Record<string, string>,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  const key = Deno.env.get('STEAM_API_KEY')
  if (!key) {
    throw new HttpError(500, 'The server is missing its Steam API key (STEAM_API_KEY secret).')
  }

  const url = new URL(`${STEAM_API}/${path}`)
  url.search = new URLSearchParams({ ...params, key, format: 'json' }).toString()

  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new HttpError(502, 'Steam could not be reached. Try again in a moment.')
  }

  if (response.status === 401 || response.status === 403) {
    throw new HttpError(500, 'Steam rejected the server\'s API key. Check the STEAM_API_KEY secret.')
  }
  if (response.status === 429) {
    throw new HttpError(503, 'Steam is limiting requests right now. Try again in a minute.')
  }
  if (!response.ok) {
    throw new HttpError(502, `Steam answered with an error (${response.status}). Try again in a moment.`)
  }

  try {
    return await response.json()
  } catch {
    throw new HttpError(502, 'Steam sent an answer that could not be read. Try again in a moment.')
  }
}

// Turns a custom profile name into the 17-digit SteamID64.
async function resolveVanity(vanity: string): Promise<string> {
  const data = await steamGet('ISteamUser/ResolveVanityURL/v1/', { vanityurl: vanity })

  const steamId = data?.response?.steamid
  if (data?.response?.success !== 1 || typeof steamId !== 'string') {
    throw new HttpError(404, `No Steam profile was found for "${vanity}". Check the spelling, or paste the full profile link.`)
  }
  return steamId
}

type OwnedGame = { appid: number; name: string; playtime_minutes: number }

async function getOwnedGames(steamId: string): Promise<OwnedGame[]> {
  const data = await steamGet('IPlayerService/GetOwnedGames/v1/', {
    steamid: steamId,
    include_appinfo: '1', // include each game's name
    include_played_free_games: '1', // include free games that were played
  })

  const response = data?.response ?? {}

  // A private profile answers with an empty object: no count and no list.
  if (!Array.isArray(response.games)) {
    if (response.game_count === 0) return []
    throw new HttpError(
      422,
      'Steam did not share any games for this profile. Set "Game details" to Public in Steam (Profile > Edit Profile > Privacy Settings) and try again.',
    )
  }

  return response.games
    // deno-lint-ignore no-explicit-any
    .filter((game: any) => Number.isInteger(game?.appid) && game.appid > 0)
    // deno-lint-ignore no-explicit-any
    .map((game: any) => {
      const name = typeof game.name === 'string' ? game.name.trim() : ''
      const minutes = Number.isInteger(game.playtime_forever) ? game.playtime_forever : 0
      return {
        appid: game.appid,
        name: (name || `App ${game.appid}`).slice(0, MAX_TITLE_LENGTH),
        playtime_minutes: Math.max(0, minutes),
      }
    })
}

// --- The request handler --------------------------------------------------------
async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'Use POST.')
    }

    if (!(await isSignedIn(req))) {
      throw new HttpError(401, 'You must be signed in to import a Steam library.')
    }

    // deno-lint-ignore no-explicit-any
    let body: any
    try {
      body = await req.json()
    } catch {
      throw new HttpError(400, 'The request body must be JSON.')
    }

    const input = parseSteamInput(body?.steamId)
    if (!input) {
      throw new HttpError(
        400,
        'Enter a 17-digit Steam ID, a custom profile name, or a steamcommunity.com profile link.',
      )
    }

    const steamId = 'steamId' in input ? input.steamId : await resolveVanity(input.vanity)
    const games = await getOwnedGames(steamId)

    return json(req, 200, { steamId, gameCount: games.length, games })
  } catch (error) {
    if (error instanceof HttpError) {
      return json(req, error.status, { error: error.message })
    }

    console.error('steam-library failed:', error)
    return json(req, 500, { error: 'Something went wrong while importing. Try again.' })
  }
}

Deno.serve(handleRequest)
