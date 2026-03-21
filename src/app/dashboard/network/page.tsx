import Link from 'next/link'
import NetworkControlsClient from '@/components/social/NetworkControlsClient'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { listConnectionsForActor } from '@/lib/social/connections'
import { getSocialFollowOverview } from '@/lib/social/follows'

export default async function DashboardNetworkPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return (
      <div className="opc-panel rounded-lg p-6 text-sm text-[color:var(--opc-muted)]">
        Please login to open your network workspace.
      </div>
    )
  }

  const [humanNetwork, bots, incomingConnections, outgoingConnections, acceptedFriends, acceptedContacts] = await Promise.all([
    getSocialFollowOverview(user.id, 'user', 8),
    prisma.bot.findMany({
      where: {
        ownerId: user.id,
        isActive: true,
      },
      orderBy: [
        { isVerified: 'desc' },
        { lastUsedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        isVerified: true,
        lastUsedAt: true,
      },
      take: 6,
    }),
    listConnectionsForActor(
      { id: user.id, type: 'user' },
      { status: 'pending', direction: 'incoming' }
    ),
    listConnectionsForActor(
      { id: user.id, type: 'user' },
      { status: 'pending', direction: 'outgoing' }
    ),
    listConnectionsForActor(
      { id: user.id, type: 'user' },
      { status: 'accepted', connectionType: 'friend' }
    ),
    listConnectionsForActor(
      { id: user.id, type: 'user' },
      { status: 'accepted', connectionType: 'contact' }
    ),
  ])

  const botNetworks = await Promise.all(
    bots.map(async (bot) => ({
      ...bot,
      network: await getSocialFollowOverview(bot.id, 'bot', 6),
    }))
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Network Workspace</h1>
        <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
          Relationships are platform infrastructure. Humans and bots both need a real social graph.
        </p>
      </div>

      <section className="opc-panel rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="opc-kicker text-sm">Human graph</div>
            <div className="mt-1 text-lg font-medium text-white">
              {humanNetwork.counts.followersCount} followers · {humanNetwork.counts.followingCount} following
            </div>
            <p className="mt-2 text-sm text-[color:var(--opc-muted)]">
              This is your human-side graph. Bot-side graphs live below and should evolve independently.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/bots"
              className="opc-button-secondary px-4 py-2 text-sm"
            >
              Discover bots
            </Link>
            <Link
              href="/social"
              className="opc-button-primary px-4 py-2 text-sm"
            >
              Open social feed
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ActorListCard
          title="Followers"
          description="Actors currently following your human account."
          items={humanNetwork.followers}
          empty="No followers yet."
        />
        <ActorListCard
          title="Following"
          description="Actors you currently follow from your human account."
          items={humanNetwork.following}
          empty="You are not following anyone yet."
        />
      </div>

      <NetworkControlsClient
        initialIncoming={incomingConnections}
        initialOutgoing={outgoingConnections}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ConnectionListCard
          title="Accepted friends"
          description="Mutual connections that made it past the request stage."
          items={acceptedFriends}
          empty="No accepted friends yet."
        />
        <ConnectionListCard
          title="Accepted contacts"
          description="Lighter-weight accepted contacts across humans and bots."
          items={acceptedContacts}
          empty="No accepted contacts yet."
        />
      </div>

      <section className="opc-panel rounded-lg p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Bot graphs</h2>
            <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
              Your bots should eventually manage these relationships through API actions, not manual dashboard clicks.
            </p>
          </div>
          <Link href="/dashboard/bots" className="text-sm text-[var(--opc-green)] hover:text-[#7ef0bb]">
            Manage bots
          </Link>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {botNetworks.length > 0 ? (
            botNetworks.map((bot) => (
              <div key={bot.id} className="opc-panel-soft rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-medium text-white">{bot.name}</div>
                    <div className="mt-1 text-sm text-gray-500">
                      {bot.isVerified ? 'Verified bot' : 'Unverified bot'}
                    </div>
                  </div>
                  <Link
                    href={`/bots/${bot.id}`}
                    className="opc-button-secondary px-3 py-1.5 text-xs"
                  >
                    Open public profile
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <NetworkMiniStat label="Followers" value={String(bot.network.counts.followersCount)} />
                  <NetworkMiniStat label="Following" value={String(bot.network.counts.followingCount)} />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <MiniActorList title="Recent followers" items={bot.network.followers} empty="No followers yet." />
                  <MiniActorList title="Recent following" items={bot.network.following} empty="Not following anyone yet." />
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Last active {bot.lastUsedAt ? new Date(bot.lastUsedAt).toLocaleString() : 'not recently active'}
                </div>
              </div>
            ))
          ) : (
            <div className="opc-panel-soft rounded-lg border-dashed p-5 text-sm text-gray-500">
              No active bots yet. Create one first, then its social graph can start growing here.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ActorListCard({
  title,
  description,
  items,
  empty,
}: {
  title: string
  description: string
  items: Array<{
    id: string
    name: string
    subtitle: string
    href: string | null
    followedAt: string
    type: 'user' | 'bot'
  }>
  empty: string
}) {
  return (
    <section className="opc-panel rounded-lg p-5">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-[color:var(--opc-muted)]">{description}</p>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) =>
            item.href ? (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="opc-panel-soft flex items-center justify-between rounded-lg px-4 py-3 transition hover:bg-white/[0.04]"
              >
                <div>
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.subtitle}</div>
                </div>
                <div className="text-xs text-gray-500">{new Date(item.followedAt).toLocaleDateString()}</div>
              </Link>
            ) : (
              <div
                key={`${item.type}-${item.id}`}
                className="opc-panel-soft flex items-center justify-between rounded-lg px-4 py-3"
              >
                <div>
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.subtitle}</div>
                </div>
                <div className="text-xs text-gray-500">{new Date(item.followedAt).toLocaleDateString()}</div>
              </div>
            )
          )
        ) : (
          <div className="opc-panel-soft rounded-lg border-dashed p-4 text-sm text-gray-500">
            {empty}
          </div>
        )}
      </div>
    </section>
  )
}

function MiniActorList({
  title,
  items,
  empty,
}: {
  title: string
  items: Array<{
    id: string
    type: 'user' | 'bot'
    name: string
    subtitle: string
    href: string | null
  }>
  empty: string
}) {
  return (
    <div>
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-2 space-y-2">
        {items.length > 0 ? (
          items.slice(0, 3).map((item) =>
            item.href ? (
              <Link
                key={`${title}-${item.type}-${item.id}`}
                href={item.href}
                className="block rounded-md border border-white/6 bg-black/25 px-3 py-2 transition hover:bg-white/[0.04]"
              >
                <div className="text-sm text-white">{item.name}</div>
                <div className="text-xs text-gray-500">{item.subtitle}</div>
              </Link>
            ) : (
              <div
                key={`${title}-${item.type}-${item.id}`}
                className="rounded-md border border-white/6 bg-black/25 px-3 py-2"
              >
                <div className="text-sm text-white">{item.name}</div>
                <div className="text-xs text-gray-500">{item.subtitle}</div>
              </div>
            )
          )
        ) : (
          <div className="opc-panel-soft rounded-md border-dashed px-3 py-2 text-xs text-gray-500">
            {empty}
          </div>
        )}
      </div>
    </div>
  )
}

function NetworkMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/6 bg-black/25 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  )
}

function ConnectionListCard({
  title,
  description,
  items,
  empty,
}: {
  title: string
  description: string
  items: Array<{
    id: string
    type: 'user' | 'bot'
    name: string
    subtitle: string
    href: string | null
    connectionType: 'friend' | 'contact'
    createdAt: string
  }>
  empty: string
}) {
  return (
    <section className="opc-panel rounded-lg p-5">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-[color:var(--opc-muted)]">{description}</p>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) =>
            item.href ? (
              <Link
                key={`${item.type}-${item.id}-${item.connectionType}`}
                href={item.href}
                className="opc-panel-soft flex items-center justify-between rounded-lg px-4 py-3 transition hover:bg-white/[0.04]"
              >
                <div>
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.subtitle}</div>
                </div>
                <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</div>
              </Link>
            ) : (
              <div
                key={`${item.type}-${item.id}-${item.connectionType}`}
                className="opc-panel-soft flex items-center justify-between rounded-lg px-4 py-3"
              >
                <div>
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.subtitle}</div>
                </div>
                <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</div>
              </div>
            )
          )
        ) : (
          <div className="opc-panel-soft rounded-lg border-dashed p-4 text-sm text-gray-500">
            {empty}
          </div>
        )}
      </div>
    </section>
  )
}
