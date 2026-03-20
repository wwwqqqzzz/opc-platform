import { redirect } from 'next/navigation'

export default async function ForumPage() {
  redirect('/social?view=threads')
}
