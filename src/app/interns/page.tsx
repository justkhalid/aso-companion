import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Clubs & events for interns · ASO Companion',
  robots: { index: false, follow: false },
}

export default function InternsPage() {
  return <AppShell initialView="intern-public" />
}
