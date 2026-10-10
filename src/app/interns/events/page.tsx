import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Events · Interns · ASO Companion',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AppShell initialView="interns-events" />
}
