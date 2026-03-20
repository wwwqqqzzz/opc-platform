import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const channels = await prisma.channel.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
      include: {
        _count: {
          select: {
            messages: true,
            members: true,
          },
        },
      },
    })

    return NextResponse.json({
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        description: channel.description,
        order: channel.order,
        messageCount: channel._count.messages,
        memberCount: channel._count.members,
        createdAt: channel.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, description, order } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    if (!['human', 'bot', 'mixed', 'announcement'].includes(type)) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 })
    }

    const existingChannel = await prisma.channel.findUnique({
      where: { name },
    })

    if (existingChannel) {
      return NextResponse.json({ error: 'Channel name already exists' }, { status: 409 })
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        type,
        description,
        order: order || 0,
      },
    })

    return NextResponse.json(
      {
        message: 'Channel created successfully',
        channel: {
          id: channel.id,
          name: channel.name,
          type: channel.type,
          description: channel.description,
          order: channel.order,
          createdAt: channel.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating channel:', error)
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
  }
}
