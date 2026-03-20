import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    where: {
      status: 'in_progress',
    },
    include: {
      idea: true,
      launch: true,
    },
    orderBy: { createdAt: 'desc' },
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
            <h1 className="text-3xl font-bold">🔨 Active Projects</h1>
            <p className="text-gray-400 mt-2">Ideas being built by AI Agents</p>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const agentTeam = JSON.parse(project.agentTeam || '[]')

              return (
                <div
                  key={project.id}
                  className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-6 transition"
                >
                  {/* Status Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400">
                      🔨 In Progress
                    </span>
                    {project.idea && (
                      <Link
                        href={`/idea/${project.idea.id}`}
                        className="text-cyan-400 hover:text-cyan-300 text-sm"
                      >
                        💡 Source Idea
                      </Link>
                    )}
                  </div>

                  {/* Title */}
                  <Link href={`/project/${project.id}`}>
                    <h3 className="text-xl font-semibold mb-2 hover:text-emerald-400 transition">
                      {project.title}
                    </h3>
                  </Link>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {project.description || 'No description provided'}
                  </p>

                  {/* Owner */}
                  {project.ownerName && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-gray-400 text-sm">👤 OPC Owner:</span>
                      <span className="text-sm font-medium">{project.ownerName}</span>
                    </div>
                  )}

                  {/* Agent Team */}
                  {agentTeam.length > 0 && (
                    <div className="mb-4">
                      <div className="text-gray-400 text-sm mb-2">Agent Team:</div>
                      <div className="flex flex-wrap gap-2">
                        {agentTeam.map((agent: { name: string; type: string }) => (
                          <span
                            key={agent.name}
                            className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs"
                          >
                            🤖 {agent.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex gap-4 pt-4 border-t border-gray-700">
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
                      >
                        📦 GitHub
                      </a>
                    )}
                    <Link
                      href={`/project/${project.id}`}
                      className="text-emerald-400 hover:text-emerald-300 text-sm"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔨</div>
            <h2 className="text-2xl font-bold mb-2">No active projects</h2>
            <p className="text-gray-400 mb-6">
              Projects will appear here once agents start building ideas.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition"
            >
              Submit an Idea
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
