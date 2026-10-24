import type { Metadata } from 'next'
import { LegalLayout, InfoCard, type LegalSection } from '@/components/legal-layout'

export const metadata: Metadata = {
  title: 'Privacy policy · ASO Companion',
  description: 'What ASO Companion, the management app of American Space Oujda, stores, where it keeps it, and who can see it.',
}

const MAIL = 'americanspaceoujda.app@gmail.com'

const sections: LegalSection[] = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <>
        <p>American Space Oujda is a partnership between the municipality of Oujda and the U.S. Embassy in Morocco. It runs a free library, English clubs, classes and events for everyone in Oujda and the Oriental region.</p>
        <p>ASO Companion is the space&apos;s own management app. The space&apos;s team builds and runs it, and this policy covers the app and its public pages. The space is responsible for the information described here. You can reach us at <a href={`mailto:${MAIL}`}>{MAIL}</a> or at the space: Bd Mohammed VI, corner of Rue Dakhla, Oujda, Morocco.</p>
      </>
    ),
  },
  {
    id: 'what',
    title: 'What the app does',
    body: (
      <>
        <p>The team uses ASO Companion to plan the weekly classes, run the calendar of clubs and events, book rooms, keep the team&apos;s contact list, record who is away and who covers, keep the library members list and the inventory of books and equipment, print membership cards, make posters, and publish posts and stories on the space&apos;s Instagram and Facebook pages.</p>
        <p>Parts of the site are public. Anyone can see the month calendar, the clubs, the events, the classes and the free rooms. Everything else needs an access code or a sign-in.</p>
      </>
    ),
  },
  {
    id: 'data',
    title: 'Information we handle',
    body: (
      <>
        <p>We handle only what the space needs to run its programs.</p>
        <div className="grid gap-3">
          <InfoCard
            title="Team: teachers, interns, volunteers and coordinators"
            what="Name, roles, the classes, clubs and events each person looks after, phone number, email address, ASO number, and absences with their dates, reason and who covers."
            why="Running the schedule, reaching each other, and covering absences."
            where="Signed-in administrators only. Visitors never receive the team list. Cancellations on the public pages show no reason."
          />
          <InfoCard
            title="Library members"
            what="Name, occupation, date joined, whether a card was printed, whether a photo is on file, and the member's status in the library. Members can be children, teenagers or adults."
            why="Running the library, issuing cards and answering questions about membership."
            where="Signed-in administrators on the director's computer. The list stays in the space's Google Sheet. The app reads it when the page opens and does not keep its own copy."
          />
          <InfoCard
            title="Library and equipment inventory"
            what="Books, games, furniture and equipment with their codes, places, status and, if an item is lent, the number of the member who has it."
            why="Knowing what the space owns and where it is."
            where="Signed-in administrators."
          />
          <InfoCard
            title="Programs and publishing"
            what="Classes, clubs, events, rooms, lesson plans, posters, photos, captions and scheduled posts. When a story tags a person, that person's Instagram username."
            why="Planning the programs and telling the public about them."
            where="Teachers see the lesson plans and teaching library. Interns see the clubs and events pages. The public sees what the space chooses to publish."
          />
          <InfoCard
            title="Sign-in"
            what="Access codes for administrators, teachers and interns. When the space's Google account is used to sign in, that account's email address."
            why="Letting the right people in and keeping everyone else out."
            where="Codes are kept on the server side and never sent to visitors."
          />
        </div>
        <p>The app does not take attendance. Interns only count how many people came to a session, and no list of participants is kept. The public pages have no accounts, no advertising and no analytics. They collect nothing about visitors beyond what any web server receives with a request.</p>
      </>
    ),
  },
  {
    id: 'google',
    title: 'Google account and Google data',
    body: (
      <>
        <p>The app stores the space&apos;s data in the space&apos;s own Google Drive, and reads the library members and inventory from the space&apos;s Google Sheet. When the team signs in with the space&apos;s Google account, the app asks for two things:</p>
        <ul>
          <li>The email address of the account, to know which account signed in.</li>
          <li>Access to the files and folders that the app itself creates in Google Drive. The app cannot see any other file in the account.</li>
        </ul>
        <p>That access is used for one purpose: to save and load the space&apos;s data, the app&apos;s updates and the files the team uploads. It is not used for advertising, it is not sold, and no person reads it.</p>
        <p>ASO Companion&apos;s use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
        <p>To remove the app&apos;s access, open the Google account&apos;s security settings, go to the apps with access to the account, and remove ASO Companion. The files in Drive stay until the space deletes them.</p>
      </>
    ),
  },
  {
    id: 'meta',
    title: 'Facebook and Instagram',
    body: (
      <>
        <p>To publish for the space, the team connects the space&apos;s Facebook page and Instagram account. The app asks Meta for permission to list the pages, read basic account details and publish posts and stories. It does not ask for access to private messages.</p>
        <p>The connection key is stored encrypted. The app uses it only to publish what the team prepares, at the moment the team chooses. Anything published is public on Instagram and Facebook and falls under their rules too. The team can disconnect at any time from the app, or from the settings of the Facebook and Instagram accounts.</p>
      </>
    ),
  },
  {
    id: 'where',
    title: 'Where information is kept and who else handles it',
    body: (
      <>
        <ul>
          <li><b>Google</b> keeps the space&apos;s Drive and Sheets, and runs the small script that reads the members and inventory sheet.</li>
          <li><b>The computers of the team</b> keep a working copy of the schedule so the app is fast. Secrets such as the Instagram connection are encrypted on the computer. The app can be removed from a computer from Settings, which deletes the local copy.</li>
          <li><b>Meta</b> receives the posts and stories the team publishes.</li>
          <li><b>Vercel</b> hosts the public pages, and <b>GitHub</b> holds the app&apos;s code. Until the move to Google Drive is finished, GitHub also holds a private copy of the app&apos;s data that only the space&apos;s developer can open.</li>
        </ul>
        <p>Fonts are served from the site itself, so visiting the public pages does not contact Google Fonts. We do not sell information and we do not share it with anyone else, unless the law requires it.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and stored settings',
    body: (
      <>
        <p>The site uses a small number of things that your browser stores, all needed for it to work:</p>
        <ul>
          <li>A sign-in cookie for the team. It is signed, hidden from page scripts and lasts up to 30 days.</li>
          <li>A cookie that remembers whether the side menu is open.</li>
          <li>Settings in your browser&apos;s own storage: light or dark theme, the calendar view you picked, and a copy of the schedule so the page opens quickly.</li>
        </ul>
        <p>None of these track you across sites, and none are used for advertising.</p>
      </>
    ),
  },
  {
    id: 'keep',
    title: 'How long we keep information',
    body: (
      <>
        <p>We keep information while it is needed to run the space&apos;s programs. Team details are removed when someone leaves, and a library member&apos;s record is removed when they ask or when the library no longer needs it. Old schedules are kept as the space&apos;s history.</p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <>
        <p>Access is split by role, so each person sees only what their role needs. Secrets are encrypted, sign-in cookies are signed, and the space&apos;s Google account should use two-step verification. No system is perfectly secure. If we learn of a problem that affects your information, we will tell you.</p>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <>
        <p>You can ask us what we hold about you, ask us to correct it, or ask us to delete it. A parent or guardian can do this for a child. Write to <a href={`mailto:${MAIL}`}>{MAIL}</a> and we will answer as soon as we can.</p>
        <p>We try to handle personal data in line with Moroccan Law 09-08 on the protection of personal data. You can also contact the national data protection commission, the CNDP, if you feel your information was mishandled.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <>
        <p>When the app changes in a way that affects your information, we update this page and its date. The date at the top is the date of the latest change.</p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <>
        <p>American Space Oujda, Bd Mohammed VI, corner of Rue Dakhla, Oujda, Morocco.</p>
        <p>Email: <a href={`mailto:${MAIL}`}>{MAIL}</a></p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalLayout
      kind="privacy"
      title="Privacy policy"
      updated="24 October 2026"
      summary={
        <>
          <p>ASO Companion is the space&apos;s own tool. It keeps the schedules, the team&apos;s contacts and the library records in the space&apos;s own Google account.</p>
          <p>Nothing is sold, shared for advertising or tracked. The public pages show only the clubs, events and classes that the space chooses to publish. You can ask us at any time what we hold about you and have it corrected or deleted.</p>
        </>
      }
      sections={sections}
    />
  )
}
