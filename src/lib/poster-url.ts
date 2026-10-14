/* a smaller copy of a poster for cards and thumbnails (the server resizes it once and the browser keeps it); the full picture stays for the big view */
export const posterThumb = (poster: string | undefined, width: number): string | undefined =>
  poster && poster.startsWith('/api/poster/') ? `${poster}?w=${width}` : poster
