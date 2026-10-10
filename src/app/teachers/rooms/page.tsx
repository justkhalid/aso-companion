import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Free rooms · Teachers · ASO Companion',
}

export default function TeacherRoomsPage() {
  return <AppShell initialView="teacher-rooms" />
}
