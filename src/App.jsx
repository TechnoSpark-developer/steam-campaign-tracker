import ConnectionStatus from './components/ConnectionStatus.jsx'
import { STATUSES } from './lib/statuses.js'

// Root component. For now it renders the app shell, a legend of the statuses
// and a database connection check; login and the game library come next.
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Steam Campaign Tracker</h1>
      </header>

      <main className="app-main">
        <section className="card">
          <h2>Which campaigns have you actually finished?</h2>
          <p className="muted">
            Import your Steam library, then check off each game once you have
            completed its story. Games without a campaign can be marked as such
            or hidden from the list.
          </p>

          <ul className="status-legend">
            {STATUSES.map((status) => (
              <li key={status.value}>
                <span className={`badge badge-${status.value}`}>
                  {status.label}
                </span>
                <span className="muted">{status.description}</span>
              </li>
            ))}
          </ul>
        </section>

        <ConnectionStatus />
      </main>
    </div>
  )
}
