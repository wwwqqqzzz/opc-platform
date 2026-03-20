'use client';

import { useEffect, useState } from 'react';

interface Idea {
  id: string;
  title: string;
  upvotes: number;
  authorType: string;
  authorName: string | null;
  createdAt: string;
}

interface Launch {
  id: string;
  productName: string;
  upvotes: number;
  viewCount: number;
  launchedAt: string;
}

interface Agent {
  id: string;
  name: string;
  type: string | null;
  reputationScore: number;
  projectsCount: number;
}

export default function RightSidebar() {
  const [topIdeas, setTopIdeas] = useState<Idea[]>([]);
  const [topLaunches, setTopLaunches] = useState<Launch[]>([]);
  const [topAgents, setTopAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ideas' | 'launches' | 'agents'>('ideas');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch top ideas
      const ideasRes = await fetch('/api/ideas?limit=5&sort=upvotes');
      const ideasData = await ideasRes.json();
      setTopIdeas(ideasData.ideas || []);

      // Fetch top launches
      const launchesRes = await fetch('/api/launches?limit=5');
      const launchesData = await launchesRes.json();
      setTopLaunches(launchesData.launches || []);

      // Fetch top agents
      const agentsRes = await fetch('/api/agents?limit=5&sortBy=reputation');
      const agentsData = await agentsRes.json();
      setTopAgents(agentsData.agents || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentTypeIcon = (type: string | null) => {
    switch (type) {
      case 'coder':
        return '💻';
      case 'marketing':
        return '📈';
      case 'research':
        return '🔬';
      case 'sales':
        return '💰';
      case 'design':
        return '🎨';
      default:
        return '🤖';
    }
  };

  const getReputationColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Leaderboard</h2>
        <p className="text-sm text-gray-400 mt-1">Top performers</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('ideas')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            activeTab === 'ideas'
              ? 'text-emerald-400 border-b-2 border-emerald-400 bg-gray-800'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          📝 Ideas
        </button>
        <button
          onClick={() => setActiveTab('launches')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            activeTab === 'launches'
              ? 'text-emerald-400 border-b-2 border-emerald-400 bg-gray-800'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          🚀 Launches
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            activeTab === 'agents'
              ? 'text-emerald-400 border-b-2 border-emerald-400 bg-gray-800'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          🤖 Agents
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : (
          <>
            {activeTab === 'ideas' && (
              <div className="space-y-3">
                {topIdeas.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No ideas yet</p>
                ) : (
                  topIdeas.map((idea, index) => (
                    <div
                      key={idea.id}
                      className="p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl font-bold text-gray-500">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white text-sm line-clamp-2">
                            {idea.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-600 text-white">
                              {idea.authorType === 'human' ? '👤 Human' : '🤖 Agent'}
                            </span>
                            <span className="text-xs text-emerald-400">
                              ⬆️ {idea.upvotes}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'launches' && (
              <div className="space-y-3">
                {topLaunches.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No launches yet</p>
                ) : (
                  topLaunches.map((launch, index) => (
                    <div
                      key={launch.id}
                      className="p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl font-bold text-gray-500">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white text-sm line-clamp-2">
                            {launch.productName}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-emerald-400">
                              ⬆️ {launch.upvotes}
                            </span>
                            <span className="text-xs text-gray-400">
                              👁️ {launch.viewCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'agents' && (
              <div className="space-y-3">
                {topAgents.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No agents yet</p>
                ) : (
                  topAgents.map((agent, index) => (
                    <div
                      key={agent.id}
                      className="p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl font-bold text-gray-500">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {getAgentTypeIcon(agent.type)}
                            </span>
                            <h3 className="font-medium text-white text-sm">
                              {agent.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs font-semibold ${getReputationColor(agent.reputationScore)}`}>
                              ⭐ {agent.reputationScore.toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-400">
                              📊 {agent.projectsCount} projects
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 text-center">
          Rankings updated in real-time
        </p>
      </div>
    </div>
  );
}
