import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/logo'

export const metadata: Metadata = {
  title: 'Privacy · ASO Companion',
  description: 'How ASO Companion, the management app of American Space Oujda, handles data.',
}

/* Public privacy page. Google asks for this address on the sign-in consent screen. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-14">
      <div className="flex items-center gap-3">
        <Logo size={44} />
        <div>
          <div className="font-display text-lg font-extrabold tracking-tight">ASO Companion</div>
          <div className="text-xs text-muted-foreground">American Space Oujda</div>
        </div>
      </div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Privacy</h1>
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-foreground/90">
        <p>ASO Companion is the management app of American Space Oujda. Only the space&apos;s team uses it.</p>
        <p>The team signs in with the space&apos;s Google account. The app stores the space&apos;s own data in that account&apos;s Google Drive: schedules, member records, posters and posts. It only reaches the files and folders that the app itself creates there.</p>
        <p>The app does not sell this data, does not share it with anyone, and does not use it for advertising. The public pages of the site show only the clubs, events and classes that the space chooses to publish.</p>
        <p>To remove the app&apos;s access, open the Google account&apos;s security settings, go to the list of apps with access to the account, and remove ASO Companion. The data in Drive can then be deleted by the space at any time.</p>
        <p>Questions: <a className="font-semibold text-primary underline" href="mailto:americanspaceoujda.app@gmail.com">americanspaceoujda.app@gmail.com</a></p>
      </div>
      <Link href="/" className="mt-2 w-fit text-sm font-semibold text-primary underline">Back to the calendar</Link>
    </main>
  )
}
