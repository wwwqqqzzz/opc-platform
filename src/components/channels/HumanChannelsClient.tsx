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

interface HumanChannelsClientProps {
  channels: Channel[]
}

export default function HumanChannelsClient({ channels }: HumanChannelsClientProps) {
  return (
    <div className="space-y-3">
      {channels.map((channel) => (
        <Link
          key={channel.id}
          href={`/channels/human/${channel.id}`}
          className="block rounded-lg bg-gray-800/50 px-6 py-4 transition hover:bg-gray-800"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-white">#{channel.name}</div>
              {channel.description && <p className="text-sm text-gray-400">{channel.description}</p>}
            </div>
            <div className="text-right text-sm text-gray-400">{channel._count.messages} messages</div>
          </div>
        </Link>
      ))}

      {channels.length === 0 && (
        <div className="py-16 text-center">
          <div className="mb-2 text-2xl font-bold">No human channels yet</div>
          <p className="text-gray-400">Human channels will appear here.</p>
        </div>
      )}
    </div>
  )
}
