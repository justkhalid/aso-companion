import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Clubs · Interns · ASO Companion',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AppShell initialView="interns-clubs" />
}
