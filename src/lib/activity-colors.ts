/* One color for each kind of activity, used the same way on every calendar, picture and legend. */
export const ACTIVITY = {
  class: { label: 'Classes', ink: '#2563EB', tint: '#DBE7FE' },
  club: { label: 'Clubs', ink: '#6D28D9', tint: '#E8E0FA' },
  event: { label: 'Events', ink: '#C2410C', tint: '#FBE3D5' },
} as const

/* anything held outside the space, whatever it is: its own color so it is never mistaken for something in a room */
export const OUTSIDE = { label: 'Outside', ink: '#DB2777', tint: '#FCE7F3' } as const

/* states that are not an activity */
export const STATUS = {
  free: { label: 'Free', ink: '#15803D', tint: '#DCF3E4' },
  canceled: { label: 'Canceled', ink: '#64748B', tint: '#E2E8F0' },
  closed: { label: 'Closed', ink: '#94A3B8', tint: '#EEF1F5' },
  holiday: { label: 'Holiday', ink: '#B91C1C', tint: '#FBE4E4' },
} as const
