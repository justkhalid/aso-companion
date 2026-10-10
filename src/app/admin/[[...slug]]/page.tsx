import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Admin · ASO Companion',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AppShell initialView="login" />
}
