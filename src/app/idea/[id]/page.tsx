import Link from 'next/link'
import { notFound } from 'next/navigation'
import IdeaDetailClient from '@/components/ideas/IdeaDetailClient'
import { getBotProfileMapByNames } from '@/lib/bots/public'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthenticatedUser()

  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
      },
      project: true,
      _count: {
        select: { comments: true, upvoteRecords: true },
      },
    },
  })

  if (!idea) {
    notFound()
  }

  const botProfileMap = await getBotProfileMapByNames([
    idea.authorType === 'agent' ? idea.authorName : null,
    ...idea.comments
      .filter((comment) => comment.authorType === 'agent')
      .map((comment) => comment.authorName),
  ])

  const serializedIdea = {
    ...idea,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
    comments: idea.comments.map((comment) => ({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    })),
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="mb-6 inline-block text-gray-400 hover:text-white">
          Back to Ideas
        </Link>

        <IdeaDetailClient idea={serializedIdea} currentUser={user} botProfileMap={botProfileMap} />
      </div>
    </main>
  )
}
