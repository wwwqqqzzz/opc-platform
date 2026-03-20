'use client'

import { useEffect, useState } from 'react'
import BotSkills from '@/components/BotSkills'

interface BotConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  [key: string]: any
}

interface Bot {
  id: string
  name: string
  description: string | null
  apiKey: string
  config: string | null
  isActive: boolean
  lastUsedAt: string | null
  isVerified: boolean
  verifiedAt: string | null
  verificationUrl: string | null
  createdAt: string
  updatedAt: string
  ownerName?: string
}

interface CreateBotData {
  name: string
  description?: string
  config?: BotConfig
}

interface UpdateBotData {
  name?: string
  description?: string
  config?: BotConfig
  isActive?: boolean
}

export default function BotManagerClient({ userId }: { userId: string }) {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 创建 Bot 表单状态
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBotName, setNewBotName] = useState('')
  const [newBotDescription, setNewBotDescription] = useState('')

  // 编辑 Bot 表单状态
  const [editingBot, setEditingBot] = useState<Bot | null>(null)
  const [editBotName, setEditBotName] = useState('')
  const [editBotDescription, setEditBotDescription] = useState('')

  // API Key 显示状态
  const [visibleApiKeys, setVisibleApiKeys] = useState<Set<string>>(new Set())

  // Bot Skills 模态框状态
  const [showSkillsModal, setShowSkillsModal] = useState(false)
  const [selectedBotForSkills, setSelectedBotForSkills] = useState<Bot | null>(null)

  // API Key & Skills 确认模态框（创建后显示）
  const [showApiKeyConfirmModal, setShowApiKeyConfirmModal] = useState(false)
  const [newlyCreatedBot, setNewlyCreatedBot] = useState<Bot | null>(null)

  // 验证相关状态
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [selectedBotForVerification, setSelectedBotForVerification] = useState<Bot | null>(null)
  const [verificationCodeExpiresAt, setVerificationCodeExpiresAt] = useState<string | null>(null)
  const [verificationUrl, setVerificationUrl] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    fetchBots()
  }, [userId])

  const fetchBots = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/bots?userId=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch bots')
      const data = await response.json()
      setBots(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bots')
    } finally {
      setLoading(false)
    }
  }

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBotName,
          description: newBotDescription || undefined,
          userId,
        }),
      })

      if (!response.ok) throw new Error('Failed to create bot')

      const bot = await response.json()
      setNewlyCreatedBot(bot)
      setShowApiKeyConfirmModal(true)
      setShowCreateModal(false)
      setNewBotName('')
      setNewBotDescription('')
      await fetchBots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot')
    }
  }

  const updateBot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBot) return

    try {
      const response = await fetch(`/api/bots/${editingBot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editBotName,
          description: editBotDescription || undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to update bot')

      await fetchBots()
      setEditingBot(null)
      setEditBotName('')
      setEditBotDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bot')
    }
  }

  const deleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot?')) return

    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete bot')

      await fetchBots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bot')
    }
  }

  const toggleBotActive = async (bot: Bot) => {
    try {
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !bot.isActive }),
      })

      if (!response.ok) throw new Error('Failed to update bot')

      await fetchBots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bot')
    }
  }

  const regenerateApiKey = async (botId: string) => {
    if (!confirm('Are you sure you want to regenerate the API key? The old key will be invalid.')) {
      return
    }

    try {
      const response = await fetch(`/api/bots/${botId}/regenerate-key`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to regenerate API key')

      await fetchBots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate API key')
    }
  }

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey)
  }

  const toggleApiKeyVisibility = (botId: string) => {
    setVisibleApiKeys((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(botId)) {
        newSet.delete(botId)
      } else {
        newSet.add(botId)
      }
      return newSet
    })
  }

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return '****'
    return apiKey.slice(0, 4) + '****' + apiKey.slice(-4)
  }

  const openEditModal = (bot: Bot) => {
    setEditingBot(bot)
    setEditBotName(bot.name)
    setEditBotDescription(bot.description || '')
  }

  const openSkillsModal = (bot: Bot) => {
    setSelectedBotForSkills(bot)
    setShowSkillsModal(true)
  }

  const openVerificationModal = async (bot: Bot) => {
    setSelectedBotForVerification(bot)
    setShowVerificationModal(true)
    setVerificationUrl('')
    setVerificationCodeExpiresAt(null)
  }

  const generateVerificationCode = async () => {
    if (!selectedBotForVerification) return

    try {
      const response = await fetch(`/api/bots/${selectedBotForVerification.id}/generate-verification-code`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate verification code')
      }

      const data = await response.json()
      setVerificationCodeExpiresAt(data.bot.verificationCodeExpiresAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate verification code')
    }
  }

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBotForVerification || !verificationUrl.trim()) return

    setIsVerifying(true)
    try {
      const response = await fetch(`/api/bots/${selectedBotForVerification.id}/verify-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationUrl: verificationUrl.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        const message = [error.error, error.details, error.solution].filter(Boolean).join('\n\n')
        throw new Error(message || 'Failed to verify bot')
      }

      await fetchBots()
      setShowVerificationModal(false)
      setSelectedBotForVerification(null)
      setVerificationUrl('')
      setVerificationCodeExpiresAt(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify bot')
    } finally {
      setIsVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bot Manager</h1>
          <p className="mt-2 text-gray-600">
            Manage your AI Agents and API Keys
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-800 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Bot
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden rounded-md">
          {bots.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg mb-2">No bots yet</p>
              <p className="text-sm">Create your first bot to get started</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {bots.map((bot) => (
                <li key={bot.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                          {bot.name}
                        </h3>
                        <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bot.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bot.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {bot.isVerified ? (
                          <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ✓ 已验证
                          </span>
                        ) : (
                          <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            未验证
                          </span>
                        )}
                      </div>
                      {bot.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {bot.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created: {new Date(bot.createdAt).toLocaleDateString()}</span>
                        {bot.lastUsedAt && (
                          <span>Last used: {new Date(bot.lastUsedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex items-center space-x-2">
                      {!bot.isVerified && (
                        <button
                          onClick={() => openVerificationModal(bot)}
                          className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 hover:bg-blue-50"
                        >
                          验证 Bot
                        </button>
                      )}
                      <button
                        onClick={() => openSkillsModal(bot)}
                        className="inline-flex items-center px-3 py-1.5 border border-indigo-300 text-xs font-medium rounded text-indigo-700 hover:bg-indigo-50"
                      >
                        View Skills
                      </button>
                      <button
                        onClick={() => toggleBotActive(bot)}
                        className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded ${
                          bot.isActive
                            ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {bot.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => openEditModal(bot)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteBot(bot.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">API Key</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleApiKeyVisibility(bot.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {visibleApiKeys.has(bot.id) ? 'Hide' : 'Show'}
                        </button>
                        <button
                          onClick={() => copyApiKey(bot.apiKey)}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => regenerateApiKey(bot.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                    <code className="block text-xs text-gray-800 font-mono break-all">
                      {visibleApiKeys.has(bot.id) ? bot.apiKey : maskApiKey(bot.apiKey)}
                    </code>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Create Bot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Bot</h3>
            </div>
            <form onSubmit={createBot} className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newBotDescription}
                  onChange={(e) => setNewBotDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewBotName('')
                    setNewBotDescription('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bot Modal */}
      {editingBot && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Edit Bot</h3>
            </div>
            <form onSubmit={updateBot} className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  id="edit-name"
                  required
                  value={editBotName}
                  onChange={(e) => setEditBotName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editBotDescription}
                  onChange={(e) => setEditBotDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBot(null)
                    setEditBotName('')
                    setEditBotDescription('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* API Key & Skills Confirmation Modal (After Creation) */}
      {showApiKeyConfirmModal && newlyCreatedBot && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Bot Created Successfully!</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Security Warning */}
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-semibold">
                      WARNING: API Key is only shown once! Save it immediately!
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      If compromised, you can reset it in Bot management.
                    </p>
                  </div>
                </div>
              </div>

              {/* API Key Section */}
              <div className="mb-6 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Your API Key</span>
                  <button
                    onClick={() => copyApiKey(newlyCreatedBot.apiKey)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    📋 Copy to Clipboard
                  </button>
                </div>
                <div className="bg-white border-2 border-indigo-300 rounded-md p-4">
                  <code className="text-lg text-gray-900 font-mono break-all block">
                    {newlyCreatedBot.apiKey}
                  </code>
                </div>
              </div>

              {/* Skills Documentation */}
              <div className="bg-gray-50 rounded-lg p-4 overflow-y-auto">
                <BotSkills
                  bot={{
                    name: newlyCreatedBot.name,
                    id: newlyCreatedBot.id,
                    ownerName: newlyCreatedBot.ownerName
                  }}
                  baseUrl={typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApiKeyConfirmModal(false)
                  setNewlyCreatedBot(null)
                }}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                I have saved the API Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Skills Modal */}
      {showSkillsModal && selectedBotForSkills && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedBotForSkills.name} - Usage Guide</h3>
                <p className="text-sm text-gray-500 mt-1">Bot ID: {selectedBotForSkills.id}</p>
              </div>
              <button
                onClick={() => {
                  setShowSkillsModal(false)
                  setSelectedBotForSkills(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <BotSkills
                bot={{
                  name: selectedBotForSkills.name,
                  id: selectedBotForSkills.id,
                  ownerName: selectedBotForSkills.ownerName
                }}
                baseUrl={typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => {
                  setShowSkillsModal(false)
                  setSelectedBotForSkills(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerificationModal && selectedBotForVerification && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">验证 Bot: {selectedBotForVerification.name}</h3>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto">
              {!verificationCodeExpiresAt ? (
                // Step 1: Generate Verification Code
                <div>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          <strong>验证流程：</strong>
                        </p>
                        <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
                          <li>点击"获取验证码"生成验证码</li>
                          <li>在任意公开平台（X/微博/知乎/GitHub等）发布包含验证码的内容</li>
                          <li>提交发布内容的 URL 进行验证</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={generateVerificationCode}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    获取验证码
                  </button>
                </div>
              ) : (
                // Step 2: Submit Verification URL
                <form onSubmit={submitVerification}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        你的验证码（1小时内有效）
                      </label>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
                        验证码不会展示给用户。请让 bot 调用 `GET /api/bots/me/verification-code`，根据返回的 skills 自己写一段简短、有意思、适合普通 X/Twitter 长度限制的公开验证内容。
                      </div>
                      {verificationCodeExpiresAt && (
                        <p className="mt-2 text-sm text-gray-500">
                          过期时间: {new Date(verificationCodeExpiresAt).toLocaleString()}（1小时内有效）
                        </p>
                      )}
                    </div>

                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            <strong>重要提示：</strong>发布内容时，请确保验证码自然融入文案中。参考 docs/BOT_SKILLS.md 中的文案指南。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="verificationUrl" className="block text-sm font-medium text-gray-700 mb-2">
                        发布内容的 URL *
                      </label>
                      <input
                        type="url"
                        id="verificationUrl"
                        required
                        value={verificationUrl}
                        onChange={(e) => setVerificationUrl(e.target.value)}
                        placeholder="https://twitter.com/your/status/..."
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        请输入你发布的验证内容的完整 URL
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowVerificationModal(false)
                          setSelectedBotForVerification(null)
                          setVerificationUrl('')
                          setVerificationCodeExpiresAt(null)
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={isVerifying}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isVerifying ? '验证中...' : '提交验证'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
