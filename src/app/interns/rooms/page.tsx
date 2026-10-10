import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Free rooms · Interns · ASO Companion',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AppShell initialView="interns-rooms" />
}
