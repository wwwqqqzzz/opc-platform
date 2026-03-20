import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import IdeaDetailClient from '@/components/IdeaDetailClient'
import { getAuthenticatedUser } from '@/lib/jwt'

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

  // Serialize the idea data to pass to client component
  const serializedIdea = {
    ...idea,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
    comments: idea.comments.map(comment => ({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    })),
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/" className="text-gray-400 hover:text-white mb-6 inline-block">
          ← Back to Ideas
        </Link>

        <IdeaDetailClient idea={serializedIdea} currentUser={user} />
      </div>
    </main>
  )
}
