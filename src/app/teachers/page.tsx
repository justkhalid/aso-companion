import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Teachers · ASO Companion',
}

export default function TeachersPage() {
  return <AppShell initialView="home" />
}
