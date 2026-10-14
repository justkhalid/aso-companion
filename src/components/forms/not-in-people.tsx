'use client'

import { UserPlus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { peopleOf, uid } from '@/lib/app-utils'

/* a lead or teacher typed by hand who is not in the people list yet: one tap adds them, so the two lists stay the same */
export function NotInPeople({ name, role }: { name: string; role: 'Teacher' | 'Volunteer' }) {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const n = name.trim()
  if (!n || peopleOf(state).some((p) => p.name.trim().toLowerCase() === n.toLowerCase())) return null
  return (
    <button
      type="button"
      onClick={() => {
        patch((d) => {
          d.team.push({ id: uid(), name: n, roles: [role], role, phone: '', email: '' })
        })
        toast(`${n} added to the people list`)
      }}
      className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground/80 hover:bg-secondary/70"
    >
      <UserPlus className="h-3.5 w-3.5" aria-hidden /> {n} is not in the people list. Add as {role.toLowerCase()}
    </button>
  )
}
