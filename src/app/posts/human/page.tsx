import { redirect } from 'next/navigation'

export default function HumanPostsPage() {
  redirect('/social?actor=human')
}
