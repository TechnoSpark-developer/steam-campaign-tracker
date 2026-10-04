# Steam Campaign Tracker

A web app that receives a list of purchased titles in a user's Steam library, and the user can manually checkmark or cross off games in their library that have a campaign/story and have been completed (similar to a movie watchlist).

> **Status:** in development. The deployed link and demo video are added at the end of the roadmap below.

## Spec

### What the app does

Sign in, import your Steam library (or add a game by hand), and mark the campaign of each game as not started, playing or completed. Games that have no campaign at all, such as MMOs and battle royales, can be marked "No campaign" so they do not count against your completion percentage, and any game can be hidden from the list.

### Main data

One table, `games`, with one row per game per user:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner of the row (the signed-in user) |
| `steam_appid` | integer | Steam's ID for the game; empty for games added by hand |
| `title` | text | Game name |
| `playtime_minutes` | integer | Reported by Steam on import |
| `status` | text | `not_started`, `playing`, `completed` or `no_campaign` |
| `hidden` | boolean | Hidden games are left out of the default list |
| `notes` | text | Optional personal note |
| `created_at`, `updated_at` | timestamp | Set automatically |

### Pages

- **Sign in / Register:** email and password.
- **Library:** the list of games with status controls, hide/show, search, filters and a progress summary.
- **Import:** enter a Steam ID or profile URL to pull in owned games.

### Login

Required. Every library is personal, so a user has to be signed in before creating, changing or deleting any game, and can only ever see their own rows.

## Technologies

- React + Vite (frontend)
- Supabase (Postgres database, authentication, Edge Function for the Steam import)
- Steam Web API (owned games)
- Netlify (hosting)

## Running locally

Requires [Node.js](https://nodejs.org) 20 or newer and a free [Supabase](https://supabase.com) project.

1. Clone the repository and install the dependencies:

   ```bash
   git clone https://github.com/TechnoSpark-developer/steam-campaign-tracker.git
   cd steam-campaign-tracker
   npm install
   ```

2. Create the database table. In the Supabase dashboard open **SQL Editor**, paste the contents of [`supabase/migrations/001_create_games.sql`](supabase/migrations/001_create_games.sql) and run it. The script creates the `games` table, turns on row-level security and grants access to signed-in users only.

3. Allow instant sign-up. In the Supabase dashboard go to **Authentication > Sign In / Providers > Email** and turn **Confirm email** off. Supabase's built-in mailer only delivers to members of the project's own team, so with confirmation on nobody else could finish registering.

4. Copy `.env.example` to `.env` and fill in your project's URL and publishable key (Supabase dashboard > **Connect**).

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Then open the address Vite prints, usually <http://localhost:5173>.

## Roadmap

- [x] Project spec
- [x] React + Vite scaffold
- [x] Supabase table and row-level security
- [x] Register, log in, log out
- [ ] Library: add, view, change status, delete
- [ ] Steam library import
- [ ] Filters, hide/show, search and progress stats
- [ ] Deploy to Netlify, demo video
