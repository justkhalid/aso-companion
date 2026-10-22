'use client'

import * as React from 'react'
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useStore } from '@/lib/store'
import type { State } from '@/lib/types'

/* Edit button plus a menu (duplicate, delete) for one row of any admin list.
   Delete asks once and then offers Undo, so every list behaves the same. */
export function RowActions({
  name,
  onEdit,
  onDuplicate,
  remove,
  deleteNote,
  extra,
}: {
  /** what the row is called, used in the labels ("Edit ASO-K1") */
  name: string
  onEdit: () => void
  onDuplicate?: () => void
  /** removes the row from a draft of the state */
  remove: (draft: State) => void
  deleteNote?: string
  /** more menu entries shown above Delete */
  extra?: React.ReactNode
}) {
  const [confirm, setConfirm] = React.useState(false)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)

  const doDelete = () => {
    const before = useStore.getState().state
    patch((d) => remove(d))
    toast(`Deleted ${name}`, true, { label: 'Undo', run: () => patch((d) => { Object.assign(d, JSON.parse(JSON.stringify(before)), { _rev: d._rev }) }) })
    setConfirm(false)
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={onEdit} aria-label={`Edit ${name}`}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label={`More actions for ${name}`} title="More">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onDuplicate && (
            <DropdownMenuItem onSelect={onDuplicate}>
              <Copy className="h-4 w-4" /> Duplicate
            </DropdownMenuItem>
          )}
          {extra}
          {(onDuplicate || extra) && <DropdownMenuSeparator />}
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirm(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>{deleteNote || 'You can undo this right after.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
