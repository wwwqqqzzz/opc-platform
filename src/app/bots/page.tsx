import { redirect } from 'next/navigation'

export default function BotManagerPage() {
  // Redirect to the new dashboard bots page
  redirect('/dashboard/bots')
}
