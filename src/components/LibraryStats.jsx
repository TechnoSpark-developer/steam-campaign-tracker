// Headline progress: how many campaigns are finished, as a number and a bar.
// `progress` comes from getProgress() in lib/libraryView.js.
export default function LibraryStats({ progress }) {
  const { completed, total, percent } = progress

  if (total === 0) {
    return (
      <div className="stats">
        <p className="muted">
          No campaigns to track yet. Games marked &quot;No campaign&quot; and
          hidden games are not counted.
        </p>
      </div>
    )
  }

  const summary = `${completed} of ${total} ${total === 1 ? 'campaign' : 'campaigns'} completed`

  return (
    <div className="stats">
      <p className="stats-line">
        <span className="stats-value">{percent}%</span>
        <span className="muted">{summary}</span>
      </p>

      <div
        className="meter"
        role="progressbar"
        aria-label="Campaigns completed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={summary}
        title={summary}
      >
        <div className="meter-fill" style={{ width: `${percent}%` }} />
      </div>

      <small className="muted">
        Games marked &quot;No campaign&quot; and hidden games are not counted.
      </small>
    </div>
  )
}
