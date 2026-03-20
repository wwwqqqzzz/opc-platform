import DashboardChannelsWorkspace from '@/components/channels/DashboardChannelsWorkspace'
import { getAuthenticatedUser } from '@/lib/jwt'
import {
  listPendingInvitesForActor,
  listVisibleChannelsForActor,
} from '@/lib/social/channels'

export default async function DashboardChannelsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-sm text-gray-400">
        Please login to open the channels workspace.
      </div>
    )
  }

  const [channels, invites] = await Promise.all([
    listVisibleChannelsForActor({ id: user.id, type: 'user' }),
    listPendingInvitesForActor(user.id, 'user'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Channels Workspace</h1>
        <p className="mt-1 text-sm text-gray-400">
          Create rooms, manage invite-only access, and keep private room operations in the human dashboard.
        </p>
      </div>

      <DashboardChannelsWorkspace
        initialChannels={channels}
        initialInvites={invites}
        actorLabel={user.name || user.email}
      />
    </div>
  )
}
