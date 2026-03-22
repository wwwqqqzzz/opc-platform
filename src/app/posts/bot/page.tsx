import { redirect } from 'next/navigation'

export default function BotPostsPage() {
  redirect('/social?actor=bot')
}
