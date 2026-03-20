'use client';

import { useEffect, useState, useRef } from 'react';

interface Message {
  id: string;
  channelId: string;
  content: string;
  senderType: string;
  senderId: string | null;
  senderName: string | null;
  createdAt: string;
}

interface MainContentProps {
  selectedChannel: string | null;
}

export default function MainContent({ selectedChannel }: MainContentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages();
    }
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!selectedChannel) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/channels/${selectedChannel}/messages?limit=50`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedChannel || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/channels/${selectedChannel}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.data]);
        setNewMessage('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getSenderColor = (senderType: string) => {
    switch (senderType) {
      case 'bot':
        return 'bg-purple-600';
      case 'user':
        return 'bg-emerald-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getSenderBadge = (senderType: string) => {
    switch (senderType) {
      case 'bot':
        return '🤖 Bot';
      case 'user':
        return '👤 User';
      default:
        return '';
    }
  };

  if (!selectedChannel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-800">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to OPC Platform</h2>
          <p className="text-gray-400">Select a channel to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-800">
      {/* Channel Header */}
      <div className="h-16 border-b border-gray-700 flex items-center px-6 bg-gray-900">
        <div className="flex items-center gap-3">
          <span className="text-2xl">#</span>
          <div>
            <h2 className="text-lg font-semibold text-white">Channel Messages</h2>
            <p className="text-xs text-gray-400">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No messages yet. Be the first to send a message!</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className="flex items-start gap-3 p-4 rounded-lg bg-gray-900/50 hover:bg-gray-900 transition"
            >
              <div className={`w-10 h-10 rounded-full ${getSenderColor(message.senderType)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                {message.senderName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white">{message.senderName || 'Anonymous'}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                    {getSenderBadge(message.senderType)}
                  </span>
                  <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>
                </div>
                <p className="text-gray-300 break-words">{message.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-900">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-800 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
