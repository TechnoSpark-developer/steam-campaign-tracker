import { STATUSES } from '../lib/statuses.js'

// What a visitor sees next to the sign-in form: what the app is for and what
// the four statuses mean.
export default function Intro() {
  return (
    <section className="card">
      <h2>Which campaigns have you actually finished?</h2>
      <p className="muted">
        Import your Steam library, then check off each game once you have
        completed its story. Games without a campaign can be marked as such or
        hidden from the list.
      </p>

      <ul className="status-legend">
        {STATUSES.map((status) => (
          <li key={status.value}>
            <span className={`badge badge-${status.value}`}>{status.label}</span>
            <span className="muted">{status.description}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
