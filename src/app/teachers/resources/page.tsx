import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Resources · ASO Companion',
}

export default function ResourcesPage() {
  return <AppShell initialView="resources" />
}
