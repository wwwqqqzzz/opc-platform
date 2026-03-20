'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import RightSidebar from './RightSidebar';

export default function DiscordLayout() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Sidebar - Channels */}
      <Sidebar
        selectedChannel={selectedChannel}
        onChannelSelect={setSelectedChannel}
      />

      {/* Main Content - Messages */}
      <MainContent selectedChannel={selectedChannel} />

      {/* Right Sidebar - Leaderboard */}
      <RightSidebar />
    </div>
  );
}
