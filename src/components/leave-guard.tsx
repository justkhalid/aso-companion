'use client'

import * as React from 'react'
import { useStore } from '@/lib/store'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

/* shown when the admin tries to leave a page while changes are not saved */
export function LeaveGuard() {
  const go = useStore((s) => s.leavePrompt)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState('')
  const close = () => { setErr(''); useStore.setState({ leavePrompt: null }) }
  return (
    <AlertDialog open={!!go} onOpenChange={(o) => { if (!o && !busy) close() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Save them before you leave, or stay and keep editing.{err ? ' ' + err : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" disabled={busy} onClick={close}>Stay</Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => { const g = go; close(); g?.() }}
          >
            Leave, save later
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const r = await useStore.getState().saveToCloud().catch(() => ({ ok: false, msg: 'Could not save.' }))
              setBusy(false)
              if (r.ok) { const g = go; close(); g?.() } else setErr(r.msg || 'Could not save.')
            }}
          >
            {busy ? 'Saving...' : 'Save and leave'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
