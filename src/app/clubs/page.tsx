import { redirect } from 'next/navigation'

/* Clubs and events live on /interns now; old links to /clubs land there. */
export default function ClubsRedirect() {
  redirect('/interns')
}
