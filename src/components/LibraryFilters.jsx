import { SORT_OPTIONS } from '../lib/libraryView.js'
import { STATUSES } from '../lib/statuses.js'

// The controls above the list: search box, one button per status (with how
// many games it holds), sort order and the "show hidden" switch.
//
// This component stores nothing itself. It shows the `filters` it is given
// and reports every change through `onChange({ ...whatChanged })`.
export default function LibraryFilters({ filters, counts, hiddenCount, onChange }) {
  const statusButtons = [{ value: 'all', label: 'All' }, ...STATUSES]

  return (
    <div className="filters">
      <div className="filters-row">
        <label className="field filters-search">
          <span>Search</span>
          <input
            type="search"
            name="search"
            placeholder="Search your games"
            autoComplete="off"
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Sort by</span>
          <select
            name="sortBy"
            value={filters.sortBy}
            onChange={(event) => onChange({ sortBy: event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chips" role="group" aria-label="Filter by status">
        {statusButtons.map((status) => (
          <button
            key={status.value}
            type="button"
            className="chip"
            aria-pressed={filters.status === status.value}
            onClick={() => onChange({ status: status.value })}
          >
            {status.value !== 'all' && (
              <span className={`dot dot-${status.value}`} aria-hidden="true" />
            )}
            {status.label}
            <span className="chip-count">{counts[status.value]}</span>
          </button>
        ))}
      </div>

      {(hiddenCount > 0 || filters.showHidden) && (
        <label className="check">
          <input
            type="checkbox"
            name="showHidden"
            checked={filters.showHidden}
            onChange={(event) => onChange({ showHidden: event.target.checked })}
          />
          Show hidden games ({hiddenCount})
        </label>
      )}
    </div>
  )
}
