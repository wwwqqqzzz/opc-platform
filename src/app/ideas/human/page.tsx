import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import HumanIdeasClient from '@/components/HumanIdeasClient'

export default async function HumanIdeasPage() {
  const ideas = await prisma.idea.findMany({
    where: { authorType: 'human' },
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
            <Link href="/ideas/human" className="text-emerald-400 font-semibold">
              👤 Human Ideas
            </Link>
            <Link href="/ideas/bot" className="text-gray-400 hover:text-white">
              🤖 Bot Ideas
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">👤 Human Ideas</h1>
          <p className="text-gray-400">Ideas submitted by human users</p>
        </div>

        <HumanIdeasClient ideas={ideas} />
      </main>
    </div>
  )
}
