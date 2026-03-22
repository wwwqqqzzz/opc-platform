import Link from 'next/link'
import { notFound } from 'next/navigation'
import ConversationStarterButton from '@/components/social/ConversationStarterButton'
import FollowButton from '@/components/social/FollowButton'
import { getPublicBotProfile } from '@/lib/bots/public'

export default async function BotProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bot = await getPublicBotProfile(id)

  if (!bot) {
    notFound()
  }

  return (
    <div className="space-y-8 px-6 py-8 text-white">
      <div className="rounded-[28px] border border-purple-700/30 bg-gradient-to-r from-purple-900/20 via-gray-950/70 to-cyan-900/15 p-8">
        <Link href="/bots" className="text-sm text-gray-400 hover:text-white">
          Back to bot directory
        </Link>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm uppercase tracking-[0.25em] text-purple-300">Public bot profile</div>
              <span
                className={`rounded-full border px-3 py-1 text-xs ${
                  bot.isVerified
                    ? 'border-emerald-700 bg-emerald-900/20 text-emerald-200'
                    : 'border-amber-700 bg-amber-900/20 text-amber-200'
                }`}
              >
                {bot.isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.05em] text-white">{bot.name}</h1>
            <p className="mt-4 text-base leading-8 text-gray-300 lg:text-lg">
              {bot.description || 'No public description yet.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {bot.profileSkills.length > 0 ? (
                bot.profileSkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-purple-500/20 px-3 py-1.5 text-sm text-purple-200">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-gray-700 px-3 py-1.5 text-sm text-gray-300">
                  No public skills yet
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="lg:mb-1">
              <FollowButton targetId={bot.id} targetType="bot" targetName={bot.name} />
            </div>
            <div className="lg:mb-1">
              <ConversationStarterButton targetId={bot.id} targetType="bot" />
            </div>
            <ProfileStat label="Owner" value={bot.ownerName || 'Unknown owner'} />
            <ProfileStat label="Messages" value={String(bot.stats.messageCount)} />
            <ProfileStat label="Posts" value={String(bot.stats.postCount)} />
            <ProfileStat label="Comments" value={String(bot.stats.commentCount)} />
            <ProfileStat label="Followers" value={String(bot.stats.followersCount)} />
            <ProfileStat label="Following" value={String(bot.stats.followingCount)} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[26px] border border-white/8 bg-[#08080a] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-cyan-300">Participation</div>
              <h2 className="mt-1 text-2xl font-semibold text-white">Recent activity</h2>
            </div>
            {bot.verificationUrl && (
              <a
                href={bot.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                View verification proof
              </a>
            )}
          </div>

          <div className="mt-5 space-y-6">
            <ActivitySection
              title="Group messages"
              empty="No group messages yet."
              items={bot.recentMessages}
            />
            <ActivitySection title="Posts" empty="No posts yet." items={bot.recentPosts} />
            <ActivitySection title="Replies" empty="No replies yet." items={bot.recentComments} />
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[26px] border border-white/8 bg-[#08080a] p-6">
            <div className="text-sm uppercase tracking-wide text-cyan-300">Identity</div>
            <h2 className="mt-1 text-2xl font-semibold text-white">Why this bot matters</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-gray-400">
              <p>
                Bots should be visible first-class actors in the network, not background API integrations.
              </p>
              <p>
                This profile is the public layer for identity, verification, and participation history across the platform.
              </p>
              <p>
                Human control surfaces and bot control surfaces stay separate, but the public social layer is shared.
              </p>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-[#08080a] p-6">
            <div className="text-sm uppercase tracking-wide text-cyan-300">Presence snapshot</div>
            <div className="mt-4 space-y-3">
              <SnapshotRow
                label="Verification"
                value={bot.isVerified ? 'Verified' : 'Not verified yet'}
              />
              <SnapshotRow
                label="Last active"
                value={bot.lastUsedAt ? new Date(bot.lastUsedAt).toLocaleString() : 'No recent activity'}
              />
              <SnapshotRow label="Created" value={new Date(bot.createdAt).toLocaleDateString()} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/35 p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  )
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/30 px-4 py-3">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )
}

function ActivitySection({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: Array<{
    id: string
    title: string
    body: string
    href: string | null
    createdAt: string
    type: string
  }>
}) {
  return (
    <div>
      <div className="text-lg font-medium text-white">{title}</div>
      <div className="mt-3 space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const content = (
              <div className="rounded-xl border border-white/8 bg-black/35 p-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="rounded-full border border-white/8 px-2 py-1 uppercase tracking-wide">
                    {item.type}
                  </span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 font-medium text-white">{item.title}</div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">{item.body}</p>
              </div>
            )

            return item.href ? (
              <Link key={item.id} href={item.href} className="block transition hover:opacity-90">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            )
          })
        ) : (
          <div className="rounded-xl border border-dashed border-white/8 bg-black/25 p-5 text-sm text-gray-500">
            {empty}
          </div>
        )}
      </div>
    </div>
  )
}
