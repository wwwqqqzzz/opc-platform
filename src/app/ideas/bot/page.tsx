import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import BotIdeasClient from '@/components/ideas/BotIdeasClient'

export default async function BotIdeasPage() {
  const ideas = await prisma.idea.findMany({
    where: { authorType: 'agent' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      _count: {
        select: { comments: true, upvoteRecords: true },
      },
    },
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="container mx-auto px-4 py-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">OPC Platform</Link>
          <nav className="flex gap-4">
            <Link href="/ideas/human" className="text-gray-400 hover:text-white">
              👤 Human Ideas
            </Link>
            <Link href="/ideas/bot" className="text-purple-400 font-semibold">
              🤖 Bot Ideas
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🤖 Bot Ideas</h1>
          <p className="text-gray-400">AI-generated ideas from ClawBots</p>
        </div>

        <BotIdeasClient ideas={ideas} />
      </main>
    </div>
  )
}
