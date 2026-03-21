import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'
import { getFollowCountsMap } from '@/lib/social/follows'
import { areActorsBlocked, getRelationStatus } from '@/lib/social/relations'
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request)
    const q = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase()
    const type = request.nextUrl.searchParams.get('type')
    const limit = Math.min(Number.parseInt(request.nextUrl.searchParams.get('limit') || '12', 10), 30)

    if (!q) {
      return NextResponse.json({ items: [] })
    }

    const [users, bots] = await Promise.all([
      type && type !== 'user'
        ? Promise.resolve([])
        : prisma.user.findMany({
            where: {
              name: {
                not: null,
              },
            },
            select: {
              id: true,
              name: true,
            },
            take: 200,
          }),
      type && type !== 'bot'
        ? Promise.resolve([])
        : prisma.bot.findMany({
            where: {
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              isVerified: true,
            },
            take: 200,
          }),
    ])

    const candidates = [
      ...users
        .filter((candidate) => (candidate.name || '').toLowerCase().includes(q))
        .map((candidate) => ({
          id: candidate.id,
          type: 'user' as const,
          name: candidate.name || 'Human member',
          subtitle: 'Human member',
          href: null,
        })),
      ...bots
        .filter((candidate) => candidate.name.toLowerCase().includes(q))
        .map((candidate) => ({
          id: candidate.id,
          type: 'bot' as const,
          name: candidate.name,
          subtitle: candidate.isVerified ? 'Verified bot' : 'Bot account',
          href: `/bots/${candidate.id}`,
        })),
    ].slice(0, limit)

    const filteredCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        if (!user) {
          return {
            ...candidate,
            counts: { followersCount: 0, followingCount: 0 },
            relation: null,
          }
        }

        if (
          await areActorsBlocked(
            { id: user.id, type: user.type },
            { id: candidate.id, type: candidate.type }
          )
        ) {
          return null
        }

        const relation = await getRelationStatus(
          { id: user.id, type: user.type },
          { id: candidate.id, type: candidate.type }
        )

        return {
          ...candidate,
          relation,
        }
      })
    )

    const userIds = filteredCandidates
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .filter((candidate) => candidate.type === 'user')
      .map((candidate) => candidate.id)
    const botIds = filteredCandidates
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .filter((candidate) => candidate.type === 'bot')
      .map((candidate) => candidate.id)

    const [userCounts, botCounts] = await Promise.all([
      getFollowCountsMap(userIds, 'user'),
      getFollowCountsMap(botIds, 'bot'),
    ])

    return NextResponse.json({
      items: filteredCandidates
        .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
        .map((candidate) => ({
          ...candidate,
          counts: candidate.type === 'user' ? userCounts[candidate.id] : botCounts[candidate.id],
        })),
    })
  } catch (error) {
    console.error('Error searching social actors:', error)
    return NextResponse.json({ error: 'Failed to search actors' }, { status: 500 })
  }
}
