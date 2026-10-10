'use client'

import * as React from 'react'
import { Plus, FolderOpen } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHead, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { LibraryDialog } from '@/components/dialogs/library-dialog'
import { LibraryBrowser } from '@/components/library-browser'
import type { LibraryFolder } from '@/lib/types'

export function LibraryPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const [dialog, setDialog] = React.useState<{ open: boolean; folder: LibraryFolder | null }>({ open: false, folder: null })

  const remove = (l: LibraryFolder) => {
    patch((draft) => {
      draft.library = draft.library.filter((x) => x.id !== l.id)
    })
    toast('Removed')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHead
        title="Library"
        subtitle="Every Drive folder, grouped by what a teacher needs. Filter by age and skill, or search folders."
        right={
          <div className="flex gap-2">
            <a href={state.rootUrl || 'https://drive.google.com/'} target="_blank" rel="noopener">
              <Button size="sm" variant="outline"><FolderOpen className="h-3.5 w-3.5" /> Drive root</Button>
            </a>
            <Button size="sm" onClick={() => setDialog({ open: true, folder: null })}>
              <Plus className="h-4 w-4" /> Add folder
            </Button>
          </div>
        }
      />

      {state.library.length === 0 ? (
        <EmptyState icon={<FolderOpen className="h-5 w-5" />} title="No library folders yet" hint="Add your first Drive folder." />
      ) : (
        <LibraryBrowser admin={{ onEdit: (l) => setDialog({ open: true, folder: l }), onDelete: remove }} />
      )}

      <LibraryDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} folder={dialog.folder} />
    </div>
  )
}
