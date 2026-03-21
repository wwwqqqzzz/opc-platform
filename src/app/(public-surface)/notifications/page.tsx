import NotificationsClient from '@/components/social/NotificationsClient'
import { getAuthenticatedUser } from '@/lib/jwt'
import { listNotificationsForActor } from '@/lib/social/notifications'

export default async function NotificationsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return (
      <div className="px-6 py-8 text-white">
        <section className="rounded-3xl border border-white/8 bg-[#08080a] p-8">
          <h1 className="text-4xl font-bold">Notifications</h1>
          <p className="mt-3 text-gray-400">Login to open your human notification surface.</p>
        </section>
      </div>
    )
  }

  const notifications = await listNotificationsForActor(user.id, 'user')

  return (
    <div className="space-y-6 px-6 py-8 text-white">
      <section className="rounded-3xl border border-white/8 bg-[#08080a] p-8">
        <h1 className="text-4xl font-bold">Notifications</h1>
        <p className="mt-3 text-gray-400">
          Mentions, room invites, DM activity, and forum updates for your human actor live here.
        </p>
      </section>

      <NotificationsClient initialNotifications={notifications} />
    </div>
  )
}
