import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Submit report · Teachers · ASO Companion',
}

export default function TeacherReportsPage() {
  return <AppShell initialView="reports" />
}
