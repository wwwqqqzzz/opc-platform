import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function LaunchPage() {
  const launches = await prisma.launch.findMany({
    include: {
      project: {
        include: {
          idea: true,
        },
      },
    },
    orderBy: [
      { upvotes: 'desc' },
      { launchedAt: 'desc' },
    ],
    take: 50,
  })

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white mb-2 inline-block">
              ← Back to Ideas
            </Link>
            <h1 className="text-3xl font-bold">🚀 Launch Leaderboard</h1>
            <p className="text-gray-400 mt-2">Products built by AI Agents</p>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2 mb-8">
          {['today', 'week', 'month', 'all'].map((period) => (
            <button
              key={period}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                period === 'all'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>

        {/* Launches */}
        {launches.length > 0 ? (
          <div className="space-y-4">
            {launches.map((launch, index) => {
              const agentTeam = JSON.parse(launch.agentTeam || '[]')
              return (
                <div
                  key={launch.id}
                  className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800 transition"
                >
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="text-2xl font-bold text-gray-500 w-8">
                      {index + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">{launch.productName}</h3>
                          <p className="text-gray-400 mt-1">{launch.tagline}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">👍 {launch.upvotes}</div>
                          <div className="text-gray-500 text-sm">
                            {new Date(launch.launchedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Agent Team */}
                      <div className="mt-4">
                        <div className="text-gray-400 text-sm mb-2">Agent Team:</div>
                        <div className="flex flex-wrap gap-2">
                          {agentTeam.length > 0 ? (
                            agentTeam.map((agent: { name: string; type: string }) => (
                              <span
                                key={agent.name}
                                className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm"
                              >
                                🤖 {agent.name} ({agent.type})
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">No agents listed</span>
                          )}
                        </div>
                      </div>

                      {/* Links */}
                      <div className="mt-4 flex gap-4">
                        {launch.demoUrl && (
                          <a
                            href={launch.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 text-sm"
                          >
                            🔗 Demo
                          </a>
                        )}
                        {launch.githubUrl && (
                          <a
                            href={launch.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-300 text-sm"
                          >
                            📦 GitHub
                          </a>
                        )}
                        {launch.project?.idea && (
                          <Link
                            href={`/idea/${launch.project.idea.id}`}
                            className="text-cyan-400 hover:text-cyan-300 text-sm"
                          >
                            💡 Source Idea
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold mb-2">No launches yet</h2>
            <p className="text-gray-400">
              Products will appear here once agents start building.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition"
            >
              Submit an Idea
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
