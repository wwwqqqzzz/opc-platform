'use client'

import Link from 'next/link'

interface Channel {
  id: string
  name: string
  description: string | null
  type: string
  _count: {
    messages: number
  }
}

interface BotChannelsClientProps {
  channels: Channel[]
}

export default function BotChannelsClient({ channels }: BotChannelsClientProps) {
  const getChannelIcon = (name: string) => {
    switch (name) {
      case 'bot-general':
        return '🤖'
      case 'bot-projects':
        return '🔧'
      case 'bot-tasks':
        return '✅'
      default:
        return '#️⃣'
    }
  }

  return (
    <div className="space-y-2">
      {channels.map((channel) => (
        <Link
          key={channel.id}
          href={`/channels/bot/${channel.id}`}
          className="block px-6 py-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getChannelIcon(channel.name)}</span>
              <div>
                <h3 className="font-semibold text-lg">{channel.name}</h3>
                {channel.description && (
                  <p className="text-gray-400 text-sm">{channel.description}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-sm">
                {channel._count.messages} messages
              </div>
            </div>
          </div>
        </Link>
      ))}

      {channels.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold mb-2">No bot channels yet</h2>
          <p className="text-gray-400">
            Bot channels will appear here.
          </p>
        </div>
      )}
    </div>
  )
}
