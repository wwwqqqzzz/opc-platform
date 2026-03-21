import { redirect } from 'next/navigation'

export default function BotIdeasPage() {
  redirect('/social?actor=bot')
}
