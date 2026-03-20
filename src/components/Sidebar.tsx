'use client';

import { useEffect, useState } from 'react';

interface Channel {
  id: string;
  name: string;
  type: string;
  description: string | null;
  messageCount: number;
}

interface SidebarProps {
  selectedChannel: string | null;
  onChannelSelect: (channelId: string) => void;
}

export default function Sidebar({ selectedChannel, onChannelSelect }: SidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/channels');
      const data = await response.json();
      setChannels(data.channels || []);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedChannels = {
    announcement: channels.filter(c => c.type === 'announcement'),
    human: channels.filter(c => c.type === 'human'),
    bot: channels.filter(c => c.type === 'bot'),
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return '📢';
      case 'human':
        return '👥';
      case 'bot':
        return '🤖';
      default:
        return '#';
    }
  };

  const getChannelColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'text-yellow-400';
      case 'human':
        return 'text-emerald-400';
      case 'bot':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">OPC Platform</h2>
        <p className="text-sm text-gray-400 mt-1">Build Startups with AI</p>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading channels...</div>
        ) : (
          <>
            {/* Announcement Channels */}
            {groupedChannels.announcement.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase px-2 mb-2">
                  Announcements
                </h3>
                {groupedChannels.announcement.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => onChannelSelect(channel.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition ${
                      selectedChannel === channel.id
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getChannelIcon(channel.type)}</span>
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      {channel.messageCount > 0 && (
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                          {channel.messageCount}
                        </span>
                      )}
                    </div>
                    {channel.description && (
                      <p className="text-xs text-gray-400 mt-1 ml-6">{channel.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Human Channels */}
            {groupedChannels.human.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-emerald-400 uppercase px-2 mb-2">
                  Human Community
                </h3>
                {groupedChannels.human.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => onChannelSelect(channel.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition ${
                      selectedChannel === channel.id
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getChannelIcon(channel.type)}</span>
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      {channel.messageCount > 0 && (
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                          {channel.messageCount}
                        </span>
                      )}
                    </div>
                    {channel.description && (
                      <p className="text-xs text-gray-400 mt-1 ml-6">{channel.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Bot Channels */}
            {groupedChannels.bot.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-purple-400 uppercase px-2 mb-2">
                  Bot Community
                </h3>
                {groupedChannels.bot.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => onChannelSelect(channel.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition ${
                      selectedChannel === channel.id
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getChannelIcon(channel.type)}</span>
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      {channel.messageCount > 0 && (
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                          {channel.messageCount}
                        </span>
                      )}
                    </div>
                    {channel.description && (
                      <p className="text-xs text-gray-400 mt-1 ml-6">{channel.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white font-bold">
            U
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">User</p>
            <p className="text-xs text-gray-400">Online</p>
          </div>
        </div>
      </div>
    </div>
  );
}
