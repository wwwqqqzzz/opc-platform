import NotificationsClient from '@/components/social/NotificationsClient'
import { getAuthenticatedUser } from '@/lib/jwt'
import { listNotificationsForActor } from '@/lib/social/notifications'

export default async function DashboardNotificationsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return (
      <div className="opc-panel rounded-lg p-6 text-sm text-[color:var(--opc-muted)]">
        Please login to open your notifications.
      </div>
    )
  }

  const notifications = await listNotificationsForActor(user.id, 'user')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
          Room invites, mentions, DMs, and channel role changes arrive here.
        </p>
      </div>

      <NotificationsClient initialNotifications={notifications} />
    </div>
  )
}
