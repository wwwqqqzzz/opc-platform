import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';

// GET /api/channels - 获取所有频道列表
export async function GET(request: NextRequest) {
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
          },
        },
      },
    });

    return NextResponse.json({
      channels: channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        description: channel.description,
        order: channel.order,
        messageCount: channel._count.messages,
        createdAt: channel.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST /api/channels - 创建新频道（仅管理员）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, description, order } = body;

    // 验证必需字段
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // 验证 type 值
    if (!['human', 'bot', 'announcement'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid channel type' },
        { status: 400 }
      );
    }

    // 检查频道名是否已存在
    const existingChannel = await prisma.channel.findUnique({
      where: { name },
    });

    if (existingChannel) {
      return NextResponse.json(
        { error: 'Channel name already exists' },
        { status: 409 }
      );
    }

    // 创建频道
    const channel = await prisma.channel.create({
      data: {
        name,
        type,
        description,
        order: order || 0,
      },
    });

    return NextResponse.json({
      message: 'Channel created successfully',
      channel: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        description: channel.description,
        order: channel.order,
        createdAt: channel.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}
