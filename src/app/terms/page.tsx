import type { Metadata } from 'next'
import { LegalLayout, type LegalSection } from '@/components/legal-layout'

export const metadata: Metadata = {
  title: 'Terms of service · ASO Companion',
  description: 'The rules for using ASO Companion, the management app of American Space Oujda.',
}

const MAIL = 'americanspaceoujda.app@gmail.com'

const sections: LegalSection[] = [
  {
    id: 'about',
    title: 'About these terms',
    body: (
      <>
        <p>ASO Companion is the management app of American Space Oujda, a partnership between the municipality of Oujda and the U.S. Embassy in Morocco. It is built and run by the space&apos;s team. It is not an official product of the municipality or of the U.S. Embassy.</p>
        <p>By using the app you agree to these terms. If you do not agree, please do not use it. How we handle information is explained in the <a href="/privacy">privacy policy</a>.</p>
      </>
    ),
  },
  {
    id: 'who',
    title: 'Who may use it',
    body: (
      <>
        <p>The public pages are open to everyone. They show the month calendar, the clubs, the events, the classes and the free rooms, and are provided to help people find the space&apos;s programs.</p>
        <p>The rest of the app is for the people the space has authorized: the coordinator and administrators, teachers, interns and volunteers. Each role sees only what it needs. The space decides who gets access and can end it at any time.</p>
      </>
    ),
  },
  {
    id: 'access',
    title: 'Access codes and accounts',
    body: (
      <>
        <p>Keep your access code to yourself. Do not share it with people outside your role, and do not use someone else&apos;s. Tell the coordinator at once if you think a code or the space&apos;s Google account was exposed, so it can be changed. The space may change codes or remove access without notice when it needs to protect the app or its data.</p>
      </>
    ),
  },
  {
    id: 'use',
    title: 'Using the app properly',
    body: (
      <>
        <p>Use the app only for the work of the space. In particular:</p>
        <ul>
          <li>Treat the personal information in it, such as team contacts and library members, as confidential. Use it only for the library and the programs, and never copy it out of the app for other purposes.</li>
          <li>Publish only content you have the right to use, and that is suitable for a public space that welcomes children and adults. This includes photos of people, who should know they may be shown.</li>
          <li>Follow the rules of Instagram and Facebook when you publish through the app, and the space&apos;s own guidelines.</li>
          <li>Do not try to get into parts of the app or the data you are not authorized to see, break its security, or disrupt it for others.</li>
          <li>Do not use the app for anything unlawful, misleading or harmful.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'content',
    title: 'Content and ownership',
    body: (
      <>
        <p>The data in the app belongs to the space. Lesson plans, teaching materials, posters, photos and posts stay with their authors and owners, who allow the space to use them for its programs. By adding content you confirm that you may do so.</p>
        <p>The ASO name, the crest and the U.S. Embassy and municipality marks belong to their owners and are used here only to identify the space and its partners.</p>
      </>
    ),
  },
  {
    id: 'services',
    title: 'Other services the app relies on',
    body: (
      <>
        <p>The app works with Google (Drive, Sheets and sign-in), Meta (Facebook and Instagram), Vercel and GitHub. Their own terms apply to what they provide. If one of them changes or stops a service, parts of the app may stop working or change, and we cannot control that.</p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'How the app works in practice',
    body: (
      <>
        <ul>
          <li>Scheduled posts go out only while a computer that runs the app is switched on, awake and online. If none is, the post goes out when one is next available, and may be late.</li>
          <li>The app is updated from time to time. Features can change or be removed.</li>
          <li>The public pages are meant to be accurate, but a time, place or cancellation can change at short notice. Please check with the space before you come.</li>
          <li>Keep your own copy of anything important. The app offers a backup in Settings.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'No warranty and limits of responsibility',
    body: (
      <>
        <p>The app is provided free and as it is, without promises that it will always be available or free of errors. To the extent the law allows, the space and the people who build the app are not responsible for losses that come from using it, such as a post that goes out late, a missing record or a service outage.</p>
        <p>Nothing here limits any right you have under the law that cannot be limited.</p>
      </>
    ),
  },
  {
    id: 'ending',
    title: 'Ending access',
    body: (
      <>
        <p>You can stop using the app at any time. The space can suspend or end access for anyone who breaks these terms or who no longer works with the space. Parts of these terms that are meant to continue, such as confidentiality of other people&apos;s information, continue after access ends.</p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: (
      <>
        <p>These terms follow the laws of the Kingdom of Morocco. A dispute that cannot be settled between the parties goes to the competent courts of Oujda.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <>
        <p>We may update these terms when the app changes. The date at the top shows the latest change. Using the app after a change means you accept the new terms.</p>
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

export default function TermsPage() {
  return (
    <LegalLayout
      kind="terms"
      title="Terms of service"
      updated="24 October 2026"
      summary={
        <>
          <p>ASO Companion is free and made for the people who run American Space Oujda. The public pages are open to everyone. The rest is for the people the space has authorized.</p>
          <p>Keep your access code private, treat other people&apos;s information as confidential, publish only what you may publish, and check with the space before relying on a time or a place.</p>
        </>
      }
      sections={sections}
    />
  )
}
