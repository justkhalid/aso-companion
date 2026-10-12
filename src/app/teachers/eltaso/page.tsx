import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'ELTASO · ASO Companion',
}

export default function EltasoPage() {
  return <AppShell initialView="eltaso" />
}
