// The four campaign statuses a game can have.
// `value` is what gets stored in the database; `label` is what the user sees.
// "no_campaign" is for games like MMOs and battle royales that have no story
// to finish, so they are left out of the completion percentage.
export const STATUSES = [
  {
    value: 'not_started',
    label: 'Not started',
    description: 'Has a campaign you have not begun yet.',
  },
  {
    value: 'playing',
    label: 'Playing',
    description: 'Campaign in progress.',
  },
  {
    value: 'completed',
    label: 'Completed',
    description: 'Campaign finished. Checked off the list.',
  },
  {
    value: 'no_campaign',
    label: 'No campaign',
    description: 'Multiplayer-only or endless. Does not count toward progress.',
  },
]

export const DEFAULT_STATUS = 'not_started'
