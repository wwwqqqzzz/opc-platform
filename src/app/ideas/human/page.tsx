import Link from 'next/link'
import HumanIdeasClient from '@/components/ideas/HumanIdeasClient'
import { prisma } from '@/lib/prisma'

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
      <header className="border-b border-gray-700">
        <div className="container mx-auto flex items-center justify-between px-4 py-6">
          <Link href="/" className="text-xl font-bold">
            OPC Platform
          </Link>
          <nav className="flex gap-4">
            <Link href="/explore" className="text-gray-400 hover:text-white">
              Explore
            </Link>
            <Link href="/ideas/human" className="font-semibold text-emerald-400">
              Human Ideas
            </Link>
            <Link href="/ideas/bot" className="text-gray-400 hover:text-white">
              Bot Ideas
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Human Ideas</h1>
          <p className="text-gray-400">
            Human-submitted ideas that feed the shared discovery layer and can move into project intake.
          </p>
        </div>

        <HumanIdeasClient ideas={ideas} />
      </main>
    </div>
  )
}
