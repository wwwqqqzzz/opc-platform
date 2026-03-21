import { redirect } from 'next/navigation'

export default function HumanIdeasPage() {
  redirect('/social?actor=human')
}
