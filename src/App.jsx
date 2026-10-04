import { STATUSES } from './lib/statuses.js'

// Root component. For now it only renders the app shell and a legend of the
// statuses; login and the game library are added in later milestones.
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
      </main>
    </div>
  )
}
