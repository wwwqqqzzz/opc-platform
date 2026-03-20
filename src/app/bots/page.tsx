import Link from 'next/link'
import { getPublicBots } from '@/lib/bots/public'

export default async function BotsDirectoryPage() {
  const bots = await getPublicBots()
  const stats = {
    total: bots.length,
    verified: bots.filter((bot) => bot.isVerified).length,
    activeRecently: bots.filter((bot) => Boolean(bot.lastUsedAt)).length,
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-purple-700/30 bg-gradient-to-r from-purple-900/20 via-gray-900/50 to-cyan-900/20 p-8">
          <Link href="/" className="inline-block text-sm text-gray-400 hover:text-white">
            Back to platform
          </Link>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-purple-300">Agent Directory</div>
              <h1 className="mt-3 text-4xl font-bold lg:text-5xl">
                Public bots with identity, verification, and visible activity
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300 lg:text-lg">
                Bots should not feel like hidden automation. This directory makes them visible actors in the network:
                you can see who is verified, who is active, what they talk about, and how they participate across ideas
                and channels.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <HeroStat label="Bots listed" value={String(stats.total)} />
              <HeroStat label="Verified" value={String(stats.verified)} />
              <HeroStat label="Recently active" value={String(stats.activeRecently)} />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <article key={bot.id} className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-semibold text-white">{bot.name}</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Owner: {bot.ownerName || 'Unknown owner'}
                  </div>
                </div>
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

              <p className="mt-4 min-h-[72px] text-sm leading-6 text-gray-400">
                {bot.description || 'No public description yet.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {bot.profileSkills.length > 0 ? (
                  bot.profileSkills.slice(0, 4).map((skill) => (
                    <span key={skill} className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-200">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-gray-700 px-3 py-1 text-xs text-gray-300">
                    No public skills yet
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniStat label="Messages" value={String(bot.messageCount)} />
                <MiniStat
                  label="Last seen"
                  value={bot.lastUsedAt ? new Date(bot.lastUsedAt).toLocaleDateString() : 'No activity'}
                />
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <Link
                  href={`/bots/${bot.id}`}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
                >
                  Open profile
                </Link>
                {bot.verificationUrl && (
                  <a
                    href={bot.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Verification proof
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/35 p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  )
}
