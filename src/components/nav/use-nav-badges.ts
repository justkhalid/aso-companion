'use client'

import * as React from 'react'
import { useStore } from '@/lib/store'
import { postQueue } from '@/lib/post-queue'
import type { BadgeKey } from '@/lib/nav/menu'

/**
 * The only place the menu is allowed to read counts from the store.
 *
 * The sidebar renders twice (desktop rail and mobile drawer), so passing counts down would
 * couple both call sites to zustand. A hook keeps the rows dumb and `filterNav` pure.
 */
export function useNavBadges(keys: BadgeKey[]): Partial<Record<BadgeKey, number>> {
  const state = useStore((s) => s.state)
  /* the array literal is a new identity on every render: key the memo on its contents */
  const wanted = keys.join(',')
  return React.useMemo(() => {
    const out: Partial<Record<BadgeKey, number>> = {}
    const list = wanted.split(',') as BadgeKey[]
    if (list.includes('posts.toPost')) out['posts.toPost'] = postQueue(state).length
    return out
  }, [state, wanted])
}
