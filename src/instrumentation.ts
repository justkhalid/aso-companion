/* On the director's computer (ASO_LOCAL=1) the server itself posts scheduled posts when their time comes: it checks every 5 minutes. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.ASO_LOCAL !== '1') return
  const { runDue } = await import('./lib/social-schedule')
  const tick = () => { runDue().catch(() => undefined) }
  setTimeout(tick, 20_000)
  setInterval(tick, 5 * 60_000)
}
