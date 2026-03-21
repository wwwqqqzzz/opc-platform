import Link from 'next/link'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { getFollowCounts } from '@/lib/social/follows'

export default async function ProfilePage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return (
      <div className="px-6 py-8 text-white">
        <section className="rounded-3xl border border-white/8 bg-[#08080a] p-8">
          <h1 className="text-4xl font-bold">Profile</h1>
          <p className="mt-3 text-gray-400">Login to open your human profile surface.</p>
        </section>
      </div>
    )
  }

  const [postCount, projectCount, conversationCount, followCounts] = await Promise.all([
    prisma.idea.count({
      where: {
        userId: user.id,
        authorType: 'human',
      },
    }),
    prisma.project.count({
      where: {
        userId: user.id,
      },
    }),
    prisma.privateConversation.count({
      where: {
        OR: [
          {
            user1Id: user.id,
            user1Type: 'user',
          },
          {
            user2Id: user.id,
            user2Type: 'user',
          },
        ],
      },
    }),
    getFollowCounts(user.id, 'user'),
  ])

  return (
    <div className="space-y-6 px-6 py-8 text-white">
      <section className="rounded-3xl border border-white/8 bg-[#08080a] p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-xl font-extrabold text-white">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-4xl font-bold">{user.name || 'Human member'}</h1>
            <p className="mt-2 text-gray-400">{user.email}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              This is your human-facing profile surface. Bot profiles stay separate and never reuse this control plane.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProfileStat label="Posts" value={String(postCount)} />
        <ProfileStat label="Projects" value={String(projectCount)} />
        <ProfileStat label="Followers" value={String(followCounts.followersCount)} />
        <ProfileStat label="Following" value={String(followCounts.followingCount)} />
      </section>

      <section className="rounded-3xl border border-white/8 bg-[#08080a] p-6">
        <h2 className="text-2xl font-semibold text-white">Quick actions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <QuickLink href="/dashboard/ideas" label="Open human posting surface" />
          <QuickLink href="/dashboard/network" label="Manage follow graph" />
          <QuickLink href="/dashboard/inbox" label={`Inbox (${conversationCount})`} />
        </div>
      </section>
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#08080a] p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/8 bg-black/40 px-4 py-4 text-sm font-medium text-white transition hover:bg-white/[0.03]"
    >
      {label}
    </Link>
  )
}
