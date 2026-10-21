/* Where this copy of the app runs.
   ASO_PUBLIC_ONLY=1  the public website (on Vercel): the admin is switched off here, so there is no admin sign-in, no saving and no posting to reach.
   ASO_LOCAL=1        the director's computer: the admin runs here, with a timer for scheduled posts and the in-app updater. */
export const publicOnly = () => process.env.ASO_PUBLIC_ONLY === '1'
export const isLocal = () => process.env.ASO_LOCAL === '1'
