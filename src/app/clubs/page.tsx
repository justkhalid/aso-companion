import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Clubs & events · ASO Companion',
}

export default function ClubsPage() {
  return <AppShell initialView="clubs" />
}
