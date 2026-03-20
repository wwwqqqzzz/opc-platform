import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getAuthenticatedUser } from '@/lib/jwt';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/channels/:id/messages - 获取频道的消息历史
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 验证频道是否存在
    const channel = await prisma.channel.findUnique({
      where: { id },
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // 获取消息
    const messages = await prisma.message.findMany({
      where: {
        channelId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // 获取消息总数
    const totalCount = await prisma.message.count({
      where: {
        channelId: id,
      },
    });

    return NextResponse.json({
      messages: messages.reverse(),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + messages.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/channels/:id/messages - 发送消息到频道
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    // 验证必需字段
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // 验证频道是否存在
    const channel = await prisma.channel.findUnique({
      where: { id },
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // 获取当前用户（支持 User 和 Bot）
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 创建消息
    const message = await prisma.message.create({
      data: {
        channelId: id,
        content: content.trim(),
        senderType: 'user',
        senderId: user.id,
        senderName: user.name || user.email,
      },
    });

    return NextResponse.json({
      message: 'Message sent successfully',
      data: message,
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
